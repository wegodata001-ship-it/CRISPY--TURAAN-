import { describe, expect, it } from "vitest";
import {
  checkoutPrintOutcomeFromResult,
  checkoutSuccessPrintHint,
} from "@/lib/orders/checkout-success-hint";
import { decideCheckoutOtpGate, shouldRotateCheckoutRequestId } from "@/lib/phone-otp/checkout-client";
import { isHypStagingMockEnabled, isHypPaymentFlowActive } from "@/lib/payments/hyp/staging-mock";
import { resolveCheckoutSettlementModeFromEnv } from "@/lib/payments/hyp/checkout-plan";

describe("checkout success print hint", () => {
  it("does not claim print queue when print was skipped in test", () => {
    const outcome = checkoutPrintOutcomeFromResult({ printQueued: false, printSkipped: true });
    expect(outcome).toEqual({ kind: "skipped" });
    const ar = checkoutSuccessPrintHint(outcome, "ar");
    expect(ar).toContain("تم حفظ الطلب");
    expect(ar).toMatch(/معطّلة|الاختبار/);
    expect(ar).not.toContain("طابور الطباعة");
  });

  it("keeps print-queue wording when print was actually queued", () => {
    expect(checkoutSuccessPrintHint({ kind: "queued" }, "ar")).toContain("طابور الطباعة");
  });
});

describe("OTP + Hyp staging mock card readiness", () => {
  const staging = {
    NODE_ENV: "development",
    HYP_STAGING_MOCK: "true",
    HYP_PAYMENTS_ENABLED: "false",
    NEXT_PUBLIC_CRISPY_STAGING_MODE: "true",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "crispy-staging",
    FIREBASE_ADMIN_PROJECT_ID: "crispy-staging",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    PHONE_OTP_REQUIRED: "true",
    PHONE_OTP_STAGING_MOCK: "true",
    PHONE_OTP_REAL_SMS: "false",
  } as NodeJS.ProcessEnv;

  it("keeps Hyp mock SIGN path active without real HYP_PAYMENTS_ENABLED", () => {
    expect(isHypStagingMockEnabled(staging)).toBe(true);
    expect(isHypPaymentFlowActive(staging)).toBe(true);
    expect(resolveCheckoutSettlementModeFromEnv("card", staging).kind).toBe(
      "hyp_card_awaiting_payment"
    );
  });

  it("requires OTP proof before place, then keeps requestId on Hyp link retry", () => {
    expect(
      decideCheckoutOtpGate({
        otpRequired: true,
        proof: null,
        phone: "0501234567",
      })
    ).toEqual({ action: "open_otp" });
    expect(
      decideCheckoutOtpGate({
        otpRequired: true,
        proof: { proofId: "proof-1", phoneLocal: "0501234567" },
        phone: "0501234567",
      })
    ).toEqual({ action: "place", phoneProof: "proof-1" });
    expect(shouldRotateCheckoutRequestId("HYP_PAYMENT_LINK_FAILED")).toBe(false);
  });
});
