import { describe, expect, it, vi } from "vitest";
import {
  confirmHypPaymentFromRedirect,
  createHypClient,
  createPaymentIntentDraft,
  decideKitchenRelease,
  MemoryHypPaymentIntentStore,
  type HypHttpGet,
} from "@/lib/payments/hyp";

function enabledClient(httpGet: HypHttpGet) {
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

function seedHeldIntent(store: MemoryHypPaymentIntentStore, overrides?: Partial<{ amount: number; coupon: string }>) {
  const amount = overrides?.amount ?? 42.5;
  const draft = createPaymentIntentDraft({
    id: "req-confirm-1",
    requestId: "req-confirm-1",
    orderId: "order-confirm-1",
    orderNumber: "MC-CONFIRM-1",
    amount,
    createdAtMs: 1_000,
    couponCode: overrides?.coupon ?? "CRISPY7-01",
  });
  expect(draft).not.toBeNull();
  store.saveDurable({
    ...draft!,
    status: "redirected",
    expectedMasof: "0010345518",
    currencyCoin: 1,
    couponStatus: "held",
    kitchenPrintReleased: false,
  });
  return draft!;
}

function successQuery(input?: {
  amount?: string;
  order?: string;
  id?: string;
  sign?: string;
  masof?: string | null;
  omitSign?: boolean;
}) {
  const amount = input?.amount ?? "42.50";
  const order = input?.order ?? "CRISPY-req-confirm-1";
  const id = input?.id ?? "408941655";
  const sign = input?.sign ?? "valid-sign";
  // Official Hyp Pay success examples omit Masof; include only when explicitly testing merchant field.
  const masofPart =
    input?.masof === null ? "" : input?.masof ? `&Masof=${input.masof}` : "";
  const signPart = input?.omitSign ? "" : `&Sign=${sign}`;
  return `Id=${id}&CCode=0&Amount=${amount}&ACode=0505293&Order=${order}${masofPart}&Fild1=Test&Fild2=&Fild3=${signPart}`;
}

describe("Hyp payment confirmation (mock)", () => {
  it("confirms a valid VERIFY and releases kitchen + coupon once", async () => {
    const store = new MemoryHypPaymentIntentStore();
    const intent = seedHeldIntent(store);
    const httpGet: HypHttpGet = async (url) => {
      expect(url).toContain("What=VERIFY");
      expect(url).toContain("Sign=valid-sign");
      return { ok: true, text: "CCode=0", status: 200 };
    };

    const first = await confirmHypPaymentFromRedirect({
      client: enabledClient(httpGet),
      rawQuery: successQuery(),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      expectedMasof: "0010345518",
      expectedCoin: 1,
      nowMs: 2_000,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    store.saveDurable(first.intent);
    expect(first.intent.status).toBe("paid");
    expect(first.transactionId).toBe("408941655");
    expect(first.releaseKitchen).toBe(true);
    expect(first.finalizeCoupon).toBe(true);

    const kitchen = store.releaseKitchenOnce(intent.requestId);
    expect(kitchen.released).toBe(true);
    const kitchenAgain = store.releaseKitchenOnce(intent.requestId);
    expect(kitchenAgain.released).toBe(false);

    const coupon = store.redeemCouponOnce(intent.requestId);
    expect(coupon.redeemed).toBe(true);
    expect(coupon.intent?.couponStatus).toBe("redeemed");
    expect(store.redeemCouponOnce(intent.requestId).redeemed).toBe(false);

    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "paid",
      }).allow
    ).toBe(true);
  });

  it("rejects forged success without durable intent or with bad signature VERIFY", async () => {
    const store = new MemoryHypPaymentIntentStore();
    const missing = await confirmHypPaymentFromRedirect({
      client: enabledClient(async () => ({ ok: true, text: "CCode=0", status: 200 })),
      rawQuery: successQuery(),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      nowMs: 2_000,
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe("INTENT_NOT_FOUND");

    seedHeldIntent(store);
    const forged = await confirmHypPaymentFromRedirect({
      client: enabledClient(async () => ({ ok: true, text: "CCode=200", status: 200 })),
      rawQuery: successQuery({ sign: "tampered" }),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      nowMs: 2_000,
    });
    expect(forged.ok).toBe(false);
    if (!forged.ok) expect(forged.code).toBe("VERIFY_FAILED");
    expect(store.getByOrderRef("CRISPY-req-confirm-1")?.status).toBe("redirected");
  });

  it("rejects amount / order / merchant mismatches before trusting VERIFY", async () => {
    const store = new MemoryHypPaymentIntentStore();
    seedHeldIntent(store);
    const httpGet = vi.fn(async () => ({ ok: true, text: "CCode=0", status: 200 }));

    const amount = await confirmHypPaymentFromRedirect({
      client: enabledClient(httpGet),
      rawQuery: successQuery({ amount: "99.00" }),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      nowMs: 2_000,
    });
    expect(amount.ok).toBe(false);
    if (!amount.ok) expect(amount.code).toBe("AMOUNT_MISMATCH");

    const order = await confirmHypPaymentFromRedirect({
      client: enabledClient(httpGet),
      rawQuery: successQuery({ order: "CRISPY-OTHER" }),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      nowMs: 2_000,
    });
    expect(order.ok).toBe(false);
    if (!order.ok) expect(["INTENT_NOT_FOUND", "ORDER_MISMATCH"]).toContain(order.code);

    const merchant = await confirmHypPaymentFromRedirect({
      client: enabledClient(httpGet),
      rawQuery: successQuery({ masof: "9999999999" }),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      expectedMasof: "0010345518",
      nowMs: 2_000,
    });
    expect(merchant.ok).toBe(false);
    if (!merchant.ok) expect(merchant.code).toBe("MERCHANT_MISMATCH");

    const missingSign = await confirmHypPaymentFromRedirect({
      client: enabledClient(httpGet),
      rawQuery: successQuery({ omitSign: true }),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      expectedMasof: "0010345518",
      nowMs: 2_000,
    });
    expect(missingSign.ok).toBe(false);
    if (!missingSign.ok) expect(missingSign.code).toBe("MISSING_PARAMS");
    expect(httpGet).not.toHaveBeenCalled();
  });

  it("treats Hyp transport failure as inconclusive — does not mark failed", async () => {
    const store = new MemoryHypPaymentIntentStore();
    seedHeldIntent(store);
    const result = await confirmHypPaymentFromRedirect({
      client: enabledClient(async () => ({ ok: false, text: "CCode=NETWORK", status: 0 })),
      rawQuery: successQuery(),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      nowMs: 2_000,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.inconclusive).toBe(true);
      expect(result.code).toBe("VERIFY_INCONCLUSIVE");
    }
    expect(store.getByOrderRef("CRISPY-req-confirm-1")?.status).toBe("redirected");
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "pending",
      }).allow
    ).toBe(false);
  });

  it("idempotent confirm: second success is alreadyPaid and kitchen releases once", async () => {
    const store = new MemoryHypPaymentIntentStore();
    seedHeldIntent(store);
    const httpGet: HypHttpGet = async () => ({ ok: true, text: "CCode=0", status: 200 });
    const client = enabledClient(httpGet);

    const first = await confirmHypPaymentFromRedirect({
      client,
      rawQuery: successQuery(),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      nowMs: 2_000,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    store.saveDurable(first.intent);

    const second = await confirmHypPaymentFromRedirect({
      client,
      rawQuery: successQuery(),
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      nowMs: 3_000,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyPaid).toBe(true);

    expect(store.releaseKitchenOnce("req-confirm-1").released).toBe(true);
    expect(store.releaseKitchenOnce("req-confirm-1").released).toBe(false);
  });

  it("concurrent confirms converge without double kitchen release", async () => {
    const store = new MemoryHypPaymentIntentStore();
    seedHeldIntent(store);
    const client = enabledClient(async () => ({ ok: true, text: "CCode=0", status: 200 }));

    const [a, b] = await Promise.all([
      store.confirmVerifiedPayment({
        orderRef: "CRISPY-req-confirm-1",
        transactionId: "408941655",
        amount: 42.5,
        masof: "0010345518",
        coin: 1,
        nowMs: 5_000,
      }),
      store.confirmVerifiedPayment({
        orderRef: "CRISPY-req-confirm-1",
        transactionId: "408941655",
        amount: 42.5,
        masof: "0010345518",
        coin: 1,
        nowMs: 5_000,
      }),
    ]);

    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.alreadyPaid !== b.alreadyPaid).toBe(true);
    expect(store.getByOrderRef("CRISPY-req-confirm-1")?.status).toBe("paid");
    expect(store.getByOrderRef("CRISPY-req-confirm-1")?.hypTransactionId).toBe("408941655");

    // Simulate return handler kitchen gate after both confirms.
    const firstRelease = store.releaseKitchenOnce("req-confirm-1");
    const secondRelease = store.releaseKitchenOnce("req-confirm-1");
    expect(firstRelease.released).toBe(true);
    expect(secondRelease.released).toBe(false);
    void client;
  });

  it("when Hyp is enabled, unpaid card stays blocked from kitchen", () => {
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "pending",
      })
    ).toEqual({ allow: false, reason: "card_awaiting_payment" });
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: false,
        paymentMethod: "card",
        paymentStatus: "pending",
      }).allow
    ).toBe(true);
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "cash",
        paymentStatus: "pending",
      }).allow
    ).toBe(true);
  });

  it("restores held coupon only while unpaid; never after trusted paid", () => {
    const store = new MemoryHypPaymentIntentStore();
    seedHeldIntent(store);
    expect(store.restoreCouponIfUnpaid("req-confirm-1").restored).toBe(true);
    seedHeldIntent(store);
    store.saveDurable({
      ...store.getByRequestId("req-confirm-1")!,
      status: "paid",
      hypTransactionId: "1",
      paidAtMs: 9,
      couponStatus: "held",
    });
    expect(store.restoreCouponIfUnpaid("req-confirm-1").restored).toBe(false);
  });
});
