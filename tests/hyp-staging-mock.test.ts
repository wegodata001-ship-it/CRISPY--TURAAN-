import { describe, expect, it } from "vitest";
import { decideKitchenRelease } from "@/lib/payments/hyp/engine";
import { resolveCheckoutSettlementModeFromEnv } from "@/lib/payments/hyp/checkout-plan";
import {
  buildHypStagingMockPaymentUrl,
  createOrReuseHypStagingMockPayment,
  hypStagingMockPublicSummary,
  isHypPaymentFlowActive,
  isHypStagingMockEnabled,
  isHypStagingMockTransactionId,
  STAGING_HYP_MOCK_MASOF,
  STAGING_HYP_MOCK_PROJECT_ID,
  STAGING_HYP_MOCK_TX_PREFIX,
} from "@/lib/payments/hyp/staging-mock";

function stagingDevEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "development",
    HYP_STAGING_MOCK: "true",
    HYP_PAYMENTS_ENABLED: "false",
    NEXT_PUBLIC_CRISPY_STAGING_MODE: "true",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: STAGING_HYP_MOCK_PROJECT_ID,
    FIREBASE_ADMIN_PROJECT_ID: STAGING_HYP_MOCK_PROJECT_ID,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    ...overrides,
  };
}

describe("Hyp staging mock gates", () => {
  it("enables mock only for local crispy-staging development with explicit flag", () => {
    expect(isHypStagingMockEnabled(stagingDevEnv())).toBe(true);
    expect(isHypPaymentFlowActive(stagingDevEnv())).toBe(true);
    expect(hypStagingMockPublicSummary(stagingDevEnv()).hypPaymentsEnabledFlag).toBe(false);
  });

  it("never enables mock in production NODE_ENV or on Vercel", () => {
    expect(isHypStagingMockEnabled(stagingDevEnv({ NODE_ENV: "production" }))).toBe(false);
    expect(isHypStagingMockEnabled(stagingDevEnv({ VERCEL: "1" }))).toBe(false);
    expect(isHypStagingMockEnabled(stagingDevEnv({ VERCEL_ENV: "preview" }))).toBe(false);
  });

  it("never enables mock for another Firebase project", () => {
    expect(
      isHypStagingMockEnabled(
        stagingDevEnv({
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: "crispy-d0bf7",
          FIREBASE_ADMIN_PROJECT_ID: "crispy-d0bf7",
        })
      )
    ).toBe(false);
  });

  it("does not require HYP_PAYMENTS_ENABLED or real keys", () => {
    const env = stagingDevEnv({
      HYP_PAYMENTS_ENABLED: "false",
      HYP_PAY_MASOF: "",
      HYP_PAY_KEY: "",
      HYP_PAY_PASSP: "",
    });
    expect(isHypStagingMockEnabled(env)).toBe(true);
    expect(
      resolveCheckoutSettlementModeFromEnv("card", env).kind
    ).toBe("hyp_card_awaiting_payment");
    expect(resolveCheckoutSettlementModeFromEnv("cash", env).kind).toBe("legacy_print");
  });
});

describe("Hyp staging mock payment URL + kitchen rules", () => {
  it("builds a local mock page URL (never hyp.co.il)", () => {
    const url = buildHypStagingMockPaymentUrl({
      orderRef: "CRISPY-abc",
      amount: 10,
      env: stagingDevEnv(),
    });
    expect(url).toContain("http://localhost:3000/checkout/hyp-mock");
    expect(url).toContain("Order=CRISPY-abc");
    expect(url).not.toContain("pay.hyp.co.il");
  });

  it("creates an idempotent mock payment link without calling Hyp", () => {
    const first = createOrReuseHypStagingMockPayment({
      requestId: "req-1",
      orderId: "ord-1",
      orderNumber: "MC-2026-TEST",
      amount: 10,
      env: stagingDevEnv(),
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.orderRef).toBe("CRISPY-req-1");
    expect(first.paymentUrl).toContain("/checkout/hyp-mock");
    expect(first.reused).toBe(false);

    const reused = createOrReuseHypStagingMockPayment({
      requestId: "req-1",
      orderId: "ord-1",
      orderNumber: "MC-2026-TEST",
      amount: 10,
      existingPaymentUrl: first.paymentUrl,
      existingOrderRef: first.orderRef,
      env: stagingDevEnv(),
    });
    expect(reused.ok).toBe(true);
    if (!reused.ok) return;
    expect(reused.reused).toBe(true);
    expect(reused.paymentUrl).toBe(first.paymentUrl);
  });

  it("blocks kitchen until paid under mock flow, then allows after paid", () => {
    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "pending",
        orderStatus: "received",
      })
    ).toMatchObject({ allow: false, reason: "card_awaiting_payment" });

    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "paid",
        orderStatus: "received",
      })
    ).toMatchObject({ allow: true, reason: "card_paid" });

    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: true,
        paymentMethod: "card",
        paymentStatus: "failed",
        orderStatus: "received",
      })
    ).toMatchObject({ allow: false, reason: "card_payment_failed" });
  });

  it("recognizes mock transaction ids only", () => {
    expect(isHypStagingMockTransactionId(`${STAGING_HYP_MOCK_TX_PREFIX}123`)).toBe(true);
    expect(isHypStagingMockTransactionId("HYP-REAL-999")).toBe(false);
    expect(STAGING_HYP_MOCK_MASOF).toBe("STAGING_MOCK");
  });
});

describe("production Hyp settlement unchanged when mock off", () => {
  it("keeps flag-off card on legacy print path", () => {
    const env = stagingDevEnv({ HYP_STAGING_MOCK: "false", HYP_PAYMENTS_ENABLED: "false" });
    expect(isHypStagingMockEnabled(env)).toBe(false);
    expect(resolveCheckoutSettlementModeFromEnv("card", env).kind).toBe("legacy_print");
  });
});
