import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCheckoutPhoneProofPayload,
  checkoutRequiresPhoneOtp,
  decideCheckoutOtpGate,
  proofMatchesCheckoutPhone,
  shouldRotateCheckoutRequestId,
} from "@/lib/phone-otp/checkout-client";

describe("checkout OTP client helpers", () => {
  it("keeps checkout unchanged when OTP is not required", () => {
    expect(checkoutRequiresPhoneOtp({ required: false, mock: true })).toBe(false);
    expect(
      buildCheckoutPhoneProofPayload({
        otpRequired: false,
        proof: null,
        phone: "0501234567",
      })
    ).toEqual({ ok: true });
    expect(
      decideCheckoutOtpGate({
        otpRequired: false,
        proof: null,
        phone: "0501234567",
      })
    ).toEqual({ action: "place" });
  });

  it("opens OTP from confirm-order when required and proof is missing", () => {
    expect(checkoutRequiresPhoneOtp({ required: true, mock: true })).toBe(true);
    expect(
      decideCheckoutOtpGate({
        otpRequired: true,
        proof: null,
        phone: "0501234567",
      })
    ).toEqual({ action: "open_otp" });
    expect(
      buildCheckoutPhoneProofPayload({
        otpRequired: true,
        proof: null,
        phone: "0501234567",
      })
    ).toEqual({ ok: false, code: "PHONE_NOT_VERIFIED" });
  });

  it("places checkout when OTP is required and proof matches phone", () => {
    expect(
      decideCheckoutOtpGate({
        otpRequired: true,
        proof: { proofId: "p1", phoneLocal: "0501234567" },
        phone: "0501234567",
      })
    ).toEqual({ action: "place", phoneProof: "p1" });
    expect(
      buildCheckoutPhoneProofPayload({
        otpRequired: true,
        proof: { proofId: "p1", phoneLocal: "0501234567" },
        phone: "0501234567",
      })
    ).toEqual({ ok: true, phoneProof: "p1" });
  });

  it("re-opens OTP when phone no longer matches the stored proof", () => {
    expect(
      decideCheckoutOtpGate({
        otpRequired: true,
        proof: { proofId: "p1", phoneLocal: "0501234567" },
        phone: "0509999999",
      })
    ).toEqual({ action: "open_otp" });
    expect(
      buildCheckoutPhoneProofPayload({
        otpRequired: true,
        proof: { proofId: "p1", phoneLocal: "0501234567" },
        phone: "0509999999",
      })
    ).toEqual({ ok: false, code: "PHONE_MISMATCH" });
  });

  it("clears proof when the phone number changes", () => {
    expect(
      proofMatchesCheckoutPhone({ proofId: "p1", phoneLocal: "0501234567" }, "0501234567")
    ).toBe(true);
    expect(
      proofMatchesCheckoutPhone({ proofId: "p1", phoneLocal: "0501234567" }, "0509999999")
    ).toBe(false);
  });

  it("does not rotate requestId after Hyp SIGN/link failure (idempotent retry)", () => {
    expect(shouldRotateCheckoutRequestId("HYP_PAYMENT_LINK_FAILED")).toBe(false);
    expect(shouldRotateCheckoutRequestId("HYP_NOT_CONFIGURED")).toBe(true);
    expect(shouldRotateCheckoutRequestId("PRINT_NOT_QUEUED")).toBe(false);
  });

  it("checkout UI has no separate send-OTP button; confirm-order gates OTP", () => {
    const checkout = readFileSync(resolve(process.cwd(), "src/app/checkout/page.tsx"), "utf8");
    expect(checkout).not.toMatch(/checkout\.sendOtp/);
    expect(checkout).not.toMatch(/checkout\.otpRequiredHint/);
    expect(checkout).toMatch(/decideCheckoutOtpGate/);
    expect(checkout).toMatch(/completeCheckout\(proof\)/);
    expect(checkout).toMatch(/action === "open_otp"/);
  });
});
