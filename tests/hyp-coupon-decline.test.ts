import { describe, expect, it, vi } from "vitest";
import {
  confirmHypPaymentFromRedirect,
  createHypClient,
  createPaymentIntentDraft,
  decideKitchenRelease,
  MemoryHypPaymentIntentStore,
  shouldFinalizeBrowserHypFailureAndRestoreCoupon,
  shouldRestoreCouponAfterPaymentOutcome,
  type HypHttpGet,
} from "@/lib/payments/hyp";
import {
  mayReleaseOrderToKitchen,
  orderKitchenPrintBlockReason,
} from "@/lib/print-jobs/payment-gate";

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

function seedRedirectedHeld(store: MemoryHypPaymentIntentStore) {
  const draft = createPaymentIntentDraft({
    id: "req-coupon-1",
    requestId: "req-coupon-1",
    orderId: "order-coupon-1",
    orderNumber: "MC-COUPON-1",
    amount: 9.3,
    createdAtMs: 1_000,
    couponCode: "HYPTEST7",
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

describe("browser Hyp failure restores held coupon", () => {
  it("restores held coupon on definitive decline, never on pending leave", () => {
    expect(
      shouldFinalizeBrowserHypFailureAndRestoreCoupon({
        browserStatus: "failed",
        intentStatus: "redirected",
        paymentStatus: "pending",
      })
    ).toBe(true);
    expect(
      shouldFinalizeBrowserHypFailureAndRestoreCoupon({
        browserStatus: "cancelled",
        intentStatus: "redirected",
      })
    ).toBe(true);
    expect(
      shouldFinalizeBrowserHypFailureAndRestoreCoupon({
        browserStatus: "pending",
        intentStatus: "redirected",
      })
    ).toBe(false);
    expect(
      shouldFinalizeBrowserHypFailureAndRestoreCoupon({
        browserStatus: "failed",
        intentStatus: "paid",
      })
    ).toBe(false);
  });

  it("memory store restores coupon once on decline and blocks kitchen print", () => {
    const store = new MemoryHypPaymentIntentStore();
    const intent = seedRedirectedHeld(store);

    const first = store.recordBrowserOutcome(intent.orderRef, "failed", "PAYMENT_DECLINED");
    expect(first.ok).toBe(true);
    expect(first.couponRestored).toBe(true);
    const after = store.getByRequestId(intent.requestId);
    expect(after?.status).toBe("failed");
    expect(after?.couponStatus).toBe("restored");
    expect(after?.kitchenPrintReleased).toBe(false);

    const second = store.recordBrowserOutcome(intent.orderRef, "failed", "PAYMENT_DECLINED");
    expect(second.ok).toBe(true);
    expect(second.couponRestored).toBe(false);
    expect(store.getByRequestId(intent.requestId)?.couponStatus).toBe("restored");

    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "failed",
        orderStatus: "cancelled",
        requiresOnlinePayment: true,
      }).allow
    ).toBe(false);
    expect(
      orderKitchenPrintBlockReason(
        {
          status: "cancelled",
          paymentStatus: "failed",
          paymentMethod: "card",
          requiresOnlinePayment: true,
        },
        { hypPaymentsEnabled: true }
      )
    ).toBe("order_cancelled");
    expect(
      mayReleaseOrderToKitchen(
        {
          status: "cancelled",
          paymentStatus: "failed",
          paymentMethod: "card",
          requiresOnlinePayment: true,
        },
        { hypPaymentsEnabled: true }
      )
    ).toBe(false);
  });

  it("leaving the payment page (pending) keeps the hold and does not mark paid", () => {
    const store = new MemoryHypPaymentIntentStore();
    const intent = seedRedirectedHeld(store);
    const left = store.recordBrowserOutcome(intent.orderRef, "pending", "CONFIRM_FAILED");
    expect(left.ok).toBe(true);
    expect(left.couponRestored).toBe(false);
    const after = store.getByRequestId(intent.requestId);
    expect(after?.status).toBe("redirected");
    expect(after?.resultStatus).toBe("pending");
    expect(after?.couponStatus).toBe("held");
    expect(after?.kitchenPrintReleased).toBe(false);
  });

  it("paid success redeems coupon and allows kitchen; decline after paid is rejected", async () => {
    const store = new MemoryHypPaymentIntentStore();
    const intent = seedRedirectedHeld(store);
    const httpGet = vi.fn<HypHttpGet>(async () => ({ ok: true, text: "CCode=0", status: 200 }));
    const confirmed = await confirmHypPaymentFromRedirect({
      client: enabledClient(httpGet),
      rawQuery:
        "Id=511677099&CCode=0&Amount=9.30&ACode=1&Order=CRISPY-req-coupon-1&Sign=valid-sign",
      loadIntentByOrderRef: (orderRef) => store.getByOrderRef(orderRef),
      expectedMasof: "0010345518",
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    store.saveDurable({
      ...confirmed.intent,
      status: "paid",
      hypTransactionId: confirmed.transactionId,
      paidAtMs: Date.now(),
      couponStatus: "redeemed",
      kitchenPrintReleased: true,
      resultStatus: "paid",
    });

    expect(
      shouldRestoreCouponAfterPaymentOutcome({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "paid",
        intentStatus: "paid",
      })
    ).toBe(false);

    const declineAfterPaid = store.recordBrowserOutcome(
      intent.orderRef,
      "failed",
      "PAYMENT_DECLINED"
    );
    expect(declineAfterPaid.ok).toBe(false);
    expect(store.getByRequestId(intent.requestId)?.couponStatus).toBe("redeemed");
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "paid",
        orderStatus: "received",
        requiresOnlinePayment: true,
      })
    ).toEqual({ allow: true, reason: "card_paid" });
  });

  it("retry after decline can create a fresh held intent without releasing kitchen early", () => {
    const store = new MemoryHypPaymentIntentStore();
    const first = seedRedirectedHeld(store);
    store.recordBrowserOutcome(first.orderRef, "failed", "PAYMENT_DECLINED");
    expect(store.getByRequestId(first.requestId)?.couponStatus).toBe("restored");

    const retry = createPaymentIntentDraft({
      id: "req-coupon-2",
      requestId: "req-coupon-2",
      orderId: "order-coupon-2",
      orderNumber: "MC-COUPON-2",
      amount: 9.3,
      createdAtMs: 2_000,
      couponCode: "HYPTEST7",
    });
    expect(retry).not.toBeNull();
    store.saveDurable({
      ...retry!,
      status: "redirected",
      expectedMasof: "0010345518",
      currencyCoin: 1,
      couponStatus: "held",
      kitchenPrintReleased: false,
    });
    expect(store.getByRequestId("req-coupon-2")?.couponStatus).toBe("held");
    expect(
      orderKitchenPrintBlockReason(
        {
          status: "received",
          paymentStatus: "pending",
          paymentMethod: "card",
          requiresOnlinePayment: true,
          awaitingHypPayment: true,
        },
        { hypPaymentsEnabled: true }
      )
    ).toBe("awaiting_card_payment");
  });
});
