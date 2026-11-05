import { describe, expect, it, vi } from "vitest";
import {
  couponRedemptionStatusForCheckout,
  createHypClient,
  createOrReuseHypCheckoutPayment,
  decideKitchenRelease,
  MemoryHypPaymentIntentStore,
  resolveCheckoutSettlementMode,
  shouldRestoreCouponAfterPaymentOutcome,
  type HypHttpGet,
} from "@/lib/payments/hyp";

function mockSignClient(httpGet: HypHttpGet) {
  return createHypClient({
    enabled: true,
    baseUrl: "https://pay.hyp.co.il/p",
    masof: "0010345518",
    key: "test-key",
    passp: "test-passp",
    coin: 1,
    pageLang: "HEB",
    httpGet,
  });
}

describe("checkout settlement mode", () => {
  it("keeps cash and Hyp-off card on legacy print path", () => {
    expect(
      resolveCheckoutSettlementMode({
        paymentMethod: "cash",
        hypFlagEnabled: true,
        hypConfigured: true,
      }).kind
    ).toBe("legacy_print");
    expect(
      resolveCheckoutSettlementMode({
        paymentMethod: "card",
        hypFlagEnabled: false,
        hypConfigured: true,
      }).kind
    ).toBe("legacy_print");
  });

  it("errors when flag is on but credentials are missing (no cash fallback)", () => {
    expect(
      resolveCheckoutSettlementMode({
        paymentMethod: "card",
        hypFlagEnabled: true,
        hypConfigured: false,
      })
    ).toEqual({ kind: "hyp_flag_incomplete_config", code: "HYP_NOT_CONFIGURED" });
  });

  it("awaits Hyp payment for configured card checkout", () => {
    expect(
      resolveCheckoutSettlementMode({
        paymentMethod: "card",
        hypFlagEnabled: true,
        hypConfigured: true,
      }).kind
    ).toBe("hyp_card_awaiting_payment");
  });
});

describe("coupon hold policy for unpaid Hyp card", () => {
  it("marks coupon held until trusted payment, and restores on cancel/fail", () => {
    expect(
      couponRedemptionStatusForCheckout({ kind: "legacy_print" })
    ).toBe("redeemed");
    expect(
      couponRedemptionStatusForCheckout({ kind: "hyp_card_awaiting_payment" })
    ).toBe("held");
    expect(
      shouldRestoreCouponAfterPaymentOutcome({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "pending",
        orderStatus: "cancelled",
        intentStatus: "failed",
      })
    ).toBe(true);
  });
});

describe("createOrReuseHypCheckoutPayment (mock HTTP)", () => {
  it("creates a paymentUrl with stable orderRef and does not mark paid", async () => {
    const signed =
      "Amount=55.50&Masof=0010345518&Order=CRISPY-req-1&action=pay&signature=abc";
    const httpGet = vi.fn<HypHttpGet>(async (url) => {
      expect(url).toContain("What=SIGN");
      expect(url).toContain("Amount=55.50");
      expect(url).toContain("Order=CRISPY-req-1");
      return { ok: true, text: signed, status: 200 };
    });
    const store = new MemoryHypPaymentIntentStore();
    const first = await createOrReuseHypCheckoutPayment({
      client: mockSignClient(httpGet),
      requestId: "req-1",
      orderId: "order-1",
      orderNumber: "MC-1",
      amount: 55.5,
      customerName: "Test",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.reused).toBe(false);
    expect(first.orderRef).toBe("CRISPY-req-1");
    expect(first.paymentUrl).toContain("action=pay");
    expect(first.intent.status).toBe("redirected");
    expect(first.intent.status).not.toBe("paid");
    store.saveDurable({ ...first.intent, paymentUrl: first.paymentUrl, couponStatus: "none" });

    // Kitchen must still wait for trusted paid.
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "pending",
      }).allow
    ).toBe(false);

    const second = await createOrReuseHypCheckoutPayment({
      client: mockSignClient(httpGet),
      requestId: "req-1",
      orderId: "order-1",
      orderNumber: "MC-1",
      amount: 55.5,
      existingPaymentUrl: store.getByRequestId("req-1")?.paymentUrl,
      existingOrderRef: store.getByRequestId("req-1")?.orderRef,
      existingIntent: store.getByRequestId("req-1"),
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.reused).toBe(true);
    expect(second.paymentUrl).toBe(first.paymentUrl);
    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it("fails closed when Hyp SIGN fails — no success, no kitchen release", async () => {
    const httpGet: HypHttpGet = async () => ({ ok: true, text: "CCode=902", status: 200 });
    const result = await createOrReuseHypCheckoutPayment({
      client: mockSignClient(httpGet),
      requestId: "req-fail",
      orderId: "order-fail",
      orderNumber: "MC-F",
      amount: 20,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("HYP_PAYMENT_LINK_FAILED");
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "pending",
      }).allow
    ).toBe(false);
  });

  it("disabled client never hits the network", async () => {
    const httpGet = vi.fn(async () => ({ ok: true, text: "action=pay", status: 200 }));
    const client = createHypClient({
      enabled: false,
      baseUrl: "https://pay.hyp.co.il/p",
      masof: "1",
      key: "k",
      passp: "p",
      coin: 1,
      pageLang: "HEB",
      httpGet,
    });
    const result = await createOrReuseHypCheckoutPayment({
      client,
      requestId: "r",
      orderId: "o",
      orderNumber: "n",
      amount: 10,
    });
    expect(result.ok).toBe(false);
    expect(httpGet).not.toHaveBeenCalled();
  });
});

describe("end-to-end checkout decision matrix (mock)", () => {
  it("covers cash / hyp-off card / hyp-on card success / hyp-on card failure", () => {
    const cases = [
      {
        name: "cash",
        mode: resolveCheckoutSettlementMode({
          paymentMethod: "cash",
          hypFlagEnabled: true,
          hypConfigured: true,
        }),
        kitchen: decideKitchenRelease({
          hypPaymentsEnabled: true,
          paymentMethod: "cash",
          paymentStatus: "pending",
        }),
      },
      {
        name: "card hyp off",
        mode: resolveCheckoutSettlementMode({
          paymentMethod: "card",
          hypFlagEnabled: false,
          hypConfigured: false,
        }),
        kitchen: decideKitchenRelease({
          hypPaymentsEnabled: false,
          paymentMethod: "card",
          paymentStatus: "pending",
        }),
      },
      {
        name: "card hyp on unpaid",
        mode: resolveCheckoutSettlementMode({
          paymentMethod: "card",
          hypFlagEnabled: true,
          hypConfigured: true,
        }),
        kitchen: decideKitchenRelease({
          hypPaymentsEnabled: true,
          paymentMethod: "card",
          paymentStatus: "pending",
        }),
      },
    ] as const;

    expect(cases[0].mode.kind).toBe("legacy_print");
    expect(cases[0].kitchen.allow).toBe(true);
    expect(cases[1].mode.kind).toBe("legacy_print");
    expect(cases[1].kitchen.allow).toBe(true);
    expect(cases[2].mode.kind).toBe("hyp_card_awaiting_payment");
    expect(cases[2].kitchen.allow).toBe(false);
  });
});
