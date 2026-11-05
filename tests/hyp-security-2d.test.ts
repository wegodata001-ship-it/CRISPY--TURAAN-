import { describe, expect, it } from "vitest";
import {
  buildHypRecoveryPlan,
  createPaymentIntentDraft,
  decideKitchenPrintClaim,
  decideKitchenRelease,
  evaluateTrustedPaymentConfirmation,
  hashHypResultToken,
  hypPaySupportsDocumentedPaymentPageWebhook,
  hypPaySupportsDocumentedTransactionInquiry,
  hypResultTokensMatch,
  MemoryHypPaymentIntentStore,
  publicOrderLabel,
  shouldFlagIntentForAdminReview,
  verifyHypPaymentRedirect,
  createHypClient,
  type HypHttpGet,
} from "@/lib/payments/hyp";
import {
  canAbandonHypPayment,
  canConfirmHypPayments,
  canFlagHypPaymentReview,
} from "@/lib/auth/roles";

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

function seed(store: MemoryHypPaymentIntentStore, requestId = "req-2d-1") {
  const draft = createPaymentIntentDraft({
    id: requestId,
    requestId,
    orderId: "order-2d-1",
    orderNumber: "MC-2D-9876",
    amount: 30,
    createdAtMs: 1_000,
    couponCode: "SAVE10",
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

describe("Hyp 2D security — VERIFY merchant fields", () => {
  const order = ["Id", "CCode", "Amount", "ACode", "Order", "Fild1", "Fild2", "Fild3", "Sign"];

  it("accepts documented success redirect without Masof (merchant bound via VERIFY credentials)", async () => {
    const params = {
      Id: "1",
      CCode: "0",
      Amount: "30.00",
      ACode: "1",
      Order: "CRISPY-a",
      Fild1: "",
      Fild2: "",
      Fild3: "",
      Sign: "sig",
    };
    const httpGet: HypHttpGet = async (url) => {
      expect(url).toContain("Masof=0010345518");
      expect(url).toContain("What=VERIFY");
      return { ok: true, text: "CCode=0", status: 200 };
    };
    const result = await verifyHypPaymentRedirect(enabledClient(httpGet), {
      redirectParams: params,
      redirectParamOrder: order,
      expectedOrderRef: "CRISPY-a",
      expectedAmount: 30,
      expectedMasof: "0010345518",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects wrong Masof when the field is present, and rejects missing Sign", async () => {
    const httpGet = async () => ({ ok: true, text: "CCode=0", status: 200 });
    const badMasof = await verifyHypPaymentRedirect(enabledClient(httpGet), {
      redirectParams: {
        Id: "1",
        CCode: "0",
        Amount: "30.00",
        ACode: "1",
        Order: "CRISPY-a",
        Masof: "0000000001",
        Sign: "sig",
      },
      redirectParamOrder: [...order, "Masof"],
      expectedOrderRef: "CRISPY-a",
      expectedAmount: 30,
      expectedMasof: "0010345518",
    });
    expect(badMasof.ok).toBe(false);
    if (!badMasof.ok) expect(badMasof.code).toBe("MERCHANT_MISMATCH");

    const noSign = await verifyHypPaymentRedirect(enabledClient(httpGet), {
      redirectParams: {
        Id: "1",
        CCode: "0",
        Amount: "30.00",
        ACode: "1",
        Order: "CRISPY-a",
      },
      redirectParamOrder: ["Id", "CCode", "Amount", "ACode", "Order"],
      expectedOrderRef: "CRISPY-a",
      expectedAmount: 30,
      expectedMasof: "0010345518",
    });
    expect(noSign.ok).toBe(false);
    if (!noSign.ok) expect(noSign.code).toBe("MISSING_PARAMS");
  });
});

describe("Hyp 2D security — paid vs abandon / review races", () => {
  it("does not abandon or restore coupon after trusted paid", async () => {
    const store = new MemoryHypPaymentIntentStore();
    seed(store);
    const paid = await store.confirmVerifiedPayment({
      orderRef: "CRISPY-req-2d-1",
      transactionId: "tx-1",
      amount: 30,
      masof: "0010345518",
      coin: 1,
      nowMs: 5_000,
    });
    expect(paid.ok).toBe(true);

    const [flag, abandon] = await Promise.all([
      store.flagForReview("req-2d-1"),
      store.abandonAfterReview("req-2d-1"),
    ]);
    expect(flag.ok).toBe(false);
    if (!flag.ok) expect(flag.reason).toBe("already_paid");
    expect(abandon.ok).toBe(false);
    if (!abandon.ok) expect(abandon.reason).toBe("already_paid");
    expect(store.getByRequestId("req-2d-1")?.status).toBe("paid");
    expect(store.getByRequestId("req-2d-1")?.couponStatus).not.toBe("restored");
  });

  it("allows late VERIFY to pay after needs_review (TTL is not decline)", async () => {
    const store = new MemoryHypPaymentIntentStore();
    const intent = seed(store);
    expect(shouldFlagIntentForAdminReview(intent.createdAtMs, intent.createdAtMs + 40 * 60 * 1000, "redirected")).toBe(
      true
    );
    const flagged = await store.flagForReview("req-2d-1");
    expect(flagged.ok).toBe(true);
    expect(store.getByRequestId("req-2d-1")?.status).toBe("needs_review");

    const paid = await store.confirmVerifiedPayment({
      orderRef: "CRISPY-req-2d-1",
      transactionId: "tx-late",
      amount: 30,
      nowMs: intent.createdAtMs + 45 * 60 * 1000,
    });
    expect(paid.ok).toBe(true);
    if (paid.ok) {
      expect(paid.intent.status).toBe("paid");
      expect(paid.intent.adminReviewRequired).toBe(false);
    }
  });

  it("serializes concurrent confirms so only one first-paid path exists", async () => {
    const store = new MemoryHypPaymentIntentStore();
    seed(store);
    const [a, b] = await Promise.all([
      store.confirmVerifiedPayment({
        orderRef: "CRISPY-req-2d-1",
        transactionId: "tx-same",
        amount: 30,
        nowMs: 9_000,
      }),
      store.confirmVerifiedPayment({
        orderRef: "CRISPY-req-2d-1",
        transactionId: "tx-same",
        amount: 30,
        nowMs: 9_000,
      }),
    ]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.alreadyPaid !== b.alreadyPaid).toBe(true);
    expect(store.getByOrderRef("CRISPY-req-2d-1")?.hypTransactionId).toBe("tx-same");
  });
});

describe("Hyp 2D security — kitchen claim + print retry", () => {
  it("allows only one concurrent kitchen claim and clears claim on print failure for retry", async () => {
    const store = new MemoryHypPaymentIntentStore();
    seed(store);
    await store.confirmVerifiedPayment({
      orderRef: "CRISPY-req-2d-1",
      transactionId: "tx-k",
      amount: 30,
      nowMs: 2_000,
    });

    const first = await store.claimKitchenPrint("req-2d-1", "claim-a", 3_000);
    expect(first.decision.action).toBe("claim");
    const second = await store.claimKitchenPrint("req-2d-1", "claim-b", 3_100);
    expect(second.decision.action).toBe("deny");
    if (second.decision.action === "deny") expect(second.decision.reason).toBe("claimed_by_other");

    await store.completeKitchenPrint("req-2d-1", "claim-a", false);
    expect(store.getByRequestId("req-2d-1")?.kitchenPrintReleased).not.toBe(true);
    expect(store.getByRequestId("req-2d-1")?.kitchenPrintClaimId).toBeNull();

    const retry = await store.claimKitchenPrint("req-2d-1", "claim-c", 4_000);
    expect(retry.decision.action).toBe("claim");
    await store.completeKitchenPrint("req-2d-1", "claim-c", true);
    expect(store.getByRequestId("req-2d-1")?.kitchenPrintReleased).toBe(true);

    const after = decideKitchenPrintClaim({
      state: store.getByRequestId("req-2d-1")!,
      claimId: "claim-d",
      nowMs: 5_000,
    });
    expect(after.action).toBe("already_released");
  });
});

describe("Hyp 2D security — forged payment-result + coupons", () => {
  it("ignores forged success URL and only trusts opaque result tokens", async () => {
    const store = new MemoryHypPaymentIntentStore();
    seed(store);
    expect(store.trustedResultView("status=paid")).toBeNull();
    expect(publicOrderLabel("MC-2D-9876")).toBe("#…9876");

    const paid = await store.confirmVerifiedPayment({
      orderRef: "CRISPY-req-2d-1",
      transactionId: "tx-ui",
      amount: 30,
      nowMs: 2_000,
    });
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    const view = store.trustedResultView(paid.resultToken);
    expect(view?.status).toBe("paid");
    expect(view?.orderLabel).toBe("#…9876");
    expect(hypResultTokensMatch(hashHypResultToken(paid.resultToken), paid.resultToken)).toBe(true);

    store.redeemCouponOnce("req-2d-1");
    expect(store.getByRequestId("req-2d-1")?.couponStatus).toBe("redeemed");
    expect(store.restoreCouponIfUnpaid("req-2d-1").restored).toBe(false);
  });

  it("keeps held coupon on browser cancel and restores once on abandon", async () => {
    const store = new MemoryHypPaymentIntentStore();
    seed(store);
    const cancelled = store.recordBrowserOutcome("CRISPY-req-2d-1", "cancelled", "PAYMENT_DECLINED");
    expect(cancelled.ok).toBe(true);
    expect(store.getByRequestId("req-2d-1")?.couponStatus).toBe("held");
    const view = store.trustedResultView(cancelled.resultToken);
    expect(view?.status).toBe("cancelled");

    const abandon = await store.abandonAfterReview("req-2d-1");
    expect(abandon.ok).toBe(true);
    if (abandon.ok) expect(abandon.couponRestored).toBe(true);
    expect(store.restoreCouponIfUnpaid("req-2d-1").restored).toBe(false);
  });
});

describe("Hyp 2D security — recovery docs + roles + kitchen gate", () => {
  it("states Hyp Pay has no documented IPN or inquiry; Enterprise is separate", () => {
    expect(hypPaySupportsDocumentedPaymentPageWebhook()).toBe(false);
    expect(hypPaySupportsDocumentedTransactionInquiry()).toBe(false);
    const plan = buildHypRecoveryPlan();
    expect(plan.fallbacks).toContain("admin_review_queue");
  });

  it("restricts abandon to Admin while Manager may confirm/flag", () => {
    expect(canConfirmHypPayments("Manager")).toBe(true);
    expect(canFlagHypPaymentReview("Manager")).toBe(true);
    expect(canAbandonHypPayment("Manager")).toBe(false);
    expect(canAbandonHypPayment("Admin")).toBe(true);
    expect(canConfirmHypPayments("Employee")).toBe(false);
  });

  it("still blocks unpaid card kitchen when Hyp enabled", () => {
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "pending",
      }).allow
    ).toBe(false);
    expect(
      evaluateTrustedPaymentConfirmation({
        intent: {
          ...createPaymentIntentDraft({
            id: "x",
            requestId: "x",
            orderId: "o",
            orderNumber: "n",
            amount: 10,
            createdAtMs: 1,
          })!,
          status: "needs_review",
        },
        verified: { transactionId: "1", orderRef: "CRISPY-x", amount: 10 },
        nowMs: 99_999_999,
      }).ok
    ).toBe(true);
  });
});
