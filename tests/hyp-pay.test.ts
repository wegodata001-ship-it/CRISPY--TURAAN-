import { describe, expect, it, vi } from "vitest";
import {
  amountsMatch,
  applyPaymentVerified,
  buildHypOrderRef,
  buildHypRecoveryPlan,
  createHostedPaymentPage,
  createHypClient,
  createPaymentIntentDraft,
  decideKitchenRelease,
  hypAmountParam,
  hypConfigPublicSummary,
  isHypPaymentsEnabled,
  isIntentExpired,
  loadHypPayConfig,
  markIntentFailed,
  normalizeHypAmount,
  parseHypAmount,
  parseHypQueryString,
  rebuildOrderedQuery,
  redactSecretsFromUrl,
  shouldRestoreCouponAfterPaymentOutcome,
  verifyHypPaymentRedirect,
  type HypHttpGet,
} from "@/lib/payments/hyp";

function enabledConfig(httpGet: HypHttpGet) {
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

describe("Hyp Pay amount units", () => {
  it("formats major ILS units with two decimals (not agorot)", () => {
    expect(normalizeHypAmount(47.3)).toBe("47.30");
    expect(hypAmountParam(10)).toBe("10.00");
    expect(parseHypAmount("47.30")).toBe(47.3);
    expect(amountsMatch(47.3, 47.3)).toBe(true);
    expect(amountsMatch(47.3, 47.301)).toBe(true);
    expect(amountsMatch(47.3, 48)).toBe(false);
    expect(normalizeHypAmount(0)).toBeNull();
    expect(normalizeHypAmount(-1)).toBeNull();
  });
});

function stagingHypCreds(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    HYP_PAYMENTS_ENABLED: "true",
    HYP_PAY_MASOF: "0010345518",
    HYP_PAY_KEY: "x",
    HYP_PAY_PASSP: "y",
    NEXT_PUBLIC_CRISPY_STAGING_MODE: "true",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "crispy-staging",
    FIREBASE_ADMIN_PROJECT_ID: "crispy-staging",
    ...overrides,
  };
}

describe("Hyp Pay config gate", () => {
  it("stays disabled by default and without secrets", () => {
    expect(isHypPaymentsEnabled({})).toBe(false);
    expect(
      isHypPaymentsEnabled({
        HYP_PAYMENTS_ENABLED: "false",
        HYP_PAY_MASOF: "0010345518",
        HYP_PAY_KEY: "x",
        HYP_PAY_PASSP: "y",
      })
    ).toBe(false);
    expect(
      isHypPaymentsEnabled({
        HYP_PAYMENTS_ENABLED: "true",
        HYP_PAY_MASOF: "0010345518",
      })
    ).toBe(false);
    // Credentials alone are not enough — crispy-staging env gate is required.
    expect(
      isHypPaymentsEnabled({
        HYP_PAYMENTS_ENABLED: "true",
        HYP_PAY_MASOF: "0010345518",
        HYP_PAY_KEY: "x",
        HYP_PAY_PASSP: "y",
      })
    ).toBe(false);
    expect(isHypPaymentsEnabled(stagingHypCreds())).toBe(true);
  });

  it("requires explicit HYP_PAY_PRODUCTION_ENABLED on crispy-d0bf7", () => {
    expect(
      isHypPaymentsEnabled({
        HYP_PAYMENTS_ENABLED: "true",
        HYP_PAY_PRODUCTION_ENABLED: "false",
        HYP_STAGING_MOCK: "false",
        HYP_PAY_MASOF: "0010345518",
        HYP_PAY_KEY: "x",
        HYP_PAY_PASSP: "y",
        NEXT_PUBLIC_CRISPY_STAGING_MODE: "false",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "crispy-d0bf7",
        FIREBASE_ADMIN_PROJECT_ID: "crispy-d0bf7",
        NEXT_PUBLIC_SITE_URL: "https://almostafachicken.com",
      })
    ).toBe(false);
    expect(
      isHypPaymentsEnabled({
        HYP_PAYMENTS_ENABLED: "true",
        HYP_PAY_PRODUCTION_ENABLED: "true",
        HYP_STAGING_MOCK: "false",
        HYP_PAY_MASOF: "0010345518",
        HYP_PAY_KEY: "x",
        HYP_PAY_PASSP: "y",
        NEXT_PUBLIC_CRISPY_STAGING_MODE: "false",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "crispy-d0bf7",
        FIREBASE_ADMIN_PROJECT_ID: "crispy-d0bf7",
        NEXT_PUBLIC_SITE_URL: "https://almostafachicken.com",
        VERCEL_ENV: "production",
      })
    ).toBe(true);
  });

  it("public summary never includes KEY or PassP", () => {
    const summary = hypConfigPublicSummary(
      stagingHypCreds({
        HYP_PAY_KEY: "super-secret-key",
        HYP_PAY_PASSP: "super-secret-passp",
      })
    );
    const blob = JSON.stringify(summary);
    expect(blob).not.toContain("super-secret");
    expect(summary).not.toHaveProperty("key");
    expect(summary).not.toHaveProperty("passp");
    expect(summary.enabled).toBe(true);
    expect(summary.environmentOk).toBe(true);
    expect(summary.masofPresent).toBe(true);
  });

  it("loadHypPayConfig defaults base URL and ILS", () => {
    const cfg = loadHypPayConfig(
      stagingHypCreds({
        HYP_PAY_MASOF: "1",
        HYP_PAY_KEY: "k",
        HYP_PAY_PASSP: "p",
      })
    );
    expect(cfg.enabled).toBe(true);
    expect(cfg.baseUrl).toContain("pay.hyp.co.il");
    expect(cfg.coin).toBe(1);
    expect(cfg.pageLang).toBe("HEB");
  });
});

describe("kitchen release policy", () => {
  it("when Hyp is OFF, cash and card pending both release (legacy)", () => {
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: false,
        paymentMethod: "cash",
        paymentStatus: "pending",
      }).allow
    ).toBe(true);
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: false,
        paymentMethod: "card",
        paymentStatus: "pending",
      })
    ).toEqual({ allow: true, reason: "card_legacy_hyp_off" });
  });

  it("when Hyp is ON, card waits for paid before kitchen", () => {
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "pending",
      })
    ).toEqual({ allow: false, reason: "card_awaiting_payment" });
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "paid",
      })
    ).toEqual({ allow: true, reason: "card_paid" });
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "cash",
        paymentStatus: "pending",
      }).allow
    ).toBe(true);
  });
});

describe("payment intent idempotency", () => {
  it("builds a stable order ref and ignores duplicate paid confirmations", () => {
    expect(buildHypOrderRef("abc-123")).toBe("CRISPY-abc-123");
    const draft = createPaymentIntentDraft({
      id: "pay1",
      requestId: "abc-123",
      orderId: "ord1",
      orderNumber: "MC-1",
      amount: 55.5,
      createdAtMs: 1_000,
      couponCode: "CRISPY7-01",
    });
    expect(draft?.orderRef).toBe("CRISPY-abc-123");
    expect(draft?.status).toBe("created");

    const first = applyPaymentVerified(draft!, "tx-1", 2_000);
    expect(first.alreadyPaid).toBe(false);
    expect(first.intent.status).toBe("paid");
    expect(first.intent.hypTransactionId).toBe("tx-1");

    const second = applyPaymentVerified(first.intent, "tx-1", 3_000);
    expect(second.alreadyPaid).toBe(true);
    expect(second.duplicateTransaction).toBe(false);

    const otherTx = applyPaymentVerified(first.intent, "tx-OTHER", 4_000);
    expect(otherTx.alreadyPaid).toBe(true);
    expect(otherTx.duplicateTransaction).toBe(true);
    expect(otherTx.intent.hypTransactionId).toBe("tx-1");
  });

  it("does not mark a paid intent as failed", () => {
    const paid = applyPaymentVerified(
      createPaymentIntentDraft({
        id: "p",
        requestId: "r1",
        orderId: "o",
        orderNumber: "n",
        amount: 10,
        createdAtMs: 1,
      })!,
      "tx",
      2
    ).intent;
    expect(markIntentFailed(paid, "failed").status).toBe("paid");
  });
});

describe("coupon restore policy", () => {
  it("restores only for unpaid card intents under Hyp", () => {
    expect(
      shouldRestoreCouponAfterPaymentOutcome({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "pending",
        orderStatus: "cancelled",
      })
    ).toBe(true);
    expect(
      shouldRestoreCouponAfterPaymentOutcome({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "paid",
        orderStatus: "cancelled",
      })
    ).toBe(false);
    expect(
      shouldRestoreCouponAfterPaymentOutcome({
        hypPaymentsEnabled: false,
        paymentMethod: "card",
        orderStatus: "cancelled",
      })
    ).toBe(false);
    expect(
      shouldRestoreCouponAfterPaymentOutcome({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        intentStatus: "expired",
      })
    ).toBe(true);
  });
});

describe("query helpers and secret redaction", () => {
  it("parses Hyp query strings and rebuilds order", () => {
    const { params, order } = parseHypQueryString(
      "Id=1&CCode=0&Amount=10.00&Order=CRISPY-a&Sign=abc"
    );
    expect(params.Amount).toBe("10.00");
    expect(order[0]).toBe("Id");
    expect(rebuildOrderedQuery(params, order)).toContain("Id=1");
  });

  it("redacts KEY and PassP from URLs and never leaks in client errors", async () => {
    const redacted = redactSecretsFromUrl(
      "https://pay.hyp.co.il/p/?KEY=secret-key&PassP=secret-pass&Amount=10"
    );
    expect(redacted).not.toContain("secret-key");
    expect(redacted).not.toContain("secret-pass");
    expect(redacted).toMatch(/REDACTED/);
  });
});

describe("hosted page SIGN (mock HTTP)", () => {
  it("does not call the network when disabled", async () => {
    const httpGet = vi.fn(async () => ({ ok: true, text: "action=pay", status: 200 }));
    const client = createHypClient({
      enabled: false,
      baseUrl: "https://pay.hyp.co.il/p",
      masof: "0010345518",
      key: "k",
      passp: "p",
      coin: 1,
      pageLang: "HEB",
      httpGet,
    });
    const result = await createHostedPaymentPage(client, {
      amount: 20,
      orderRef: "CRISPY-req1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DISABLED");
    expect(httpGet).not.toHaveBeenCalled();
  });

  it("builds a payment URL from a mocked SIGN response", async () => {
    const signed =
      "Amount=20.00&Masof=0010345518&Order=CRISPY-req1&PageLang=HEB&Sign=True&action=pay&signature=abc123";
    const httpGet: HypHttpGet = async (url) => {
      expect(url).toContain("action=APISign");
      expect(url).toContain("What=SIGN");
      expect(url).toContain("Amount=20.00");
      expect(url).not.toMatch(/Amount=2000(?:\.|&|$)/); // not agorot
      return { ok: true, text: signed, status: 200 };
    };
    const result = await createHostedPaymentPage(enabledConfig(httpGet), {
      amount: 20,
      orderRef: "CRISPY-req1",
      clientName: "Test",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paymentUrl).toBe(`https://pay.hyp.co.il/p/?${signed}`);
      expect(result.paymentUrl).toContain("action=pay");
    }
  });
});

describe("VERIFY (mock HTTP)", () => {
  const redirectOrder = ["Id", "CCode", "Amount", "ACode", "Order", "Fild1", "Fild2", "Fild3", "Sign"];
  const redirectParams = {
    Id: "408941655",
    CCode: "0",
    Amount: "20.00",
    ACode: "0505293",
    Order: "CRISPY-req1",
    Fild1: "Test",
    Fild2: "",
    Fild3: "",
    Sign: "sig",
  };

  it("accepts a matching verified payment", async () => {
    const httpGet: HypHttpGet = async (url) => {
      expect(url).toContain("What=VERIFY");
      expect(url).toContain("Id=408941655");
      return { ok: true, text: "CCode=0", status: 200 };
    };
    const result = await verifyHypPaymentRedirect(enabledConfig(httpGet), {
      redirectParams,
      redirectParamOrder: redirectOrder,
      expectedOrderRef: "CRISPY-req1",
      expectedAmount: 20,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transactionId).toBe("408941655");
      expect(result.amount).toBe(20);
    }
  });

  it("rejects amount or order mismatch before trusting VERIFY", async () => {
    const httpGet = vi.fn(async () => ({ ok: true, text: "CCode=0", status: 200 }));
    const amountMismatch = await verifyHypPaymentRedirect(enabledConfig(httpGet), {
      redirectParams,
      redirectParamOrder: redirectOrder,
      expectedOrderRef: "CRISPY-req1",
      expectedAmount: 99,
    });
    expect(amountMismatch.ok).toBe(false);
    if (!amountMismatch.ok) expect(amountMismatch.code).toBe("AMOUNT_MISMATCH");

    const orderMismatch = await verifyHypPaymentRedirect(enabledConfig(httpGet), {
      redirectParams,
      redirectParamOrder: redirectOrder,
      expectedOrderRef: "CRISPY-OTHER",
      expectedAmount: 20,
    });
    expect(orderMismatch.ok).toBe(false);
    if (!orderMismatch.ok) expect(orderMismatch.code).toBe("ORDER_MISMATCH");
    expect(httpGet).not.toHaveBeenCalled();
  });

  it("rejects when Hyp VERIFY returns non-zero CCode", async () => {
    const httpGet: HypHttpGet = async () => ({ ok: true, text: "CCode=200", status: 200 });
    const result = await verifyHypPaymentRedirect(enabledConfig(httpGet), {
      redirectParams,
      redirectParamOrder: redirectOrder,
      expectedOrderRef: "CRISPY-req1",
      expectedAmount: 20,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VERIFY_FAILED");
  });
});

describe("recovery plan for paid-without-return", () => {
  it("documents layered recovery and intent TTL without assuming Hyp Pay IPN", () => {
    const plan = buildHypRecoveryPlan();
    expect(plan.primary).toBe("await_customer_return_then_verify");
    expect(plan.fallbacks).toContain("admin_reconcile_with_verify");
    expect(plan.fallbacks).toContain("admin_review_queue");
    expect(plan.fallbacks).not.toContain("scheduled_pending_sweep");
    expect(plan.documentedPaymentPageWebhook).toBe(false);
    expect(plan.documentedTransactionInquiry).toBe(false);
    expect(plan.notes.some((n) => /VERIFY/i.test(n))).toBe(true);
    expect(plan.notes.some((n) => /needs_review|admin review/i.test(n))).toBe(true);
    expect(plan.intentTtlMs).toBeGreaterThan(0);
    expect(isIntentExpired(0, plan.intentTtlMs + 1)).toBe(true);
    expect(isIntentExpired(1_000, 1_500, 10_000)).toBe(false);
  });
});
