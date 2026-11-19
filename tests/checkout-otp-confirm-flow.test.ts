import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decideCheckoutOtpGate } from "@/lib/phone-otp/checkout-client";

describe("confirm-order → OTP → auto-checkout flow", () => {
  const checkout = readFileSync(resolve(process.cwd(), "src/app/checkout/page.tsx"), "utf8");

  it("wires OTP open from confirm-order and auto-completes after verify", () => {
    expect(checkout).toMatch(/decideCheckoutOtpGate/);
    expect(checkout).toMatch(/gate\.action === "open_otp"/);
    expect(checkout).toMatch(/setOtpOpen\(true\)/);
    expect(checkout).toMatch(/onVerified=\{\(proof\) => \{/);
    expect(checkout).toMatch(/void completeCheckout\(proof\)/);
    expect(checkout).not.toMatch(/checkout\.sendOtp/);
  });

  it("preserves form state paths: dismiss OTP does not place an order", () => {
    const closeHandler = checkout.match(
      /onClose=\{\(\) => \{([\s\S]*?)\}\}/
    )?.[1];
    expect(closeHandler).toBeTruthy();
    expect(closeHandler).toMatch(/setOtpOpen\(false\)/);
    expect(closeHandler).not.toMatch(/completeCheckout/);
  });

  it("keeps requestId across OTP then place for idempotency", () => {
    expect(checkout).toMatch(/ensureCheckoutRequestId/);
    expect(checkout).toMatch(/orderRequestId\.current = ensureCheckoutRequestId/);
  });

  it("invalidates proof path when phone changes before place", () => {
    expect(checkout).toMatch(/proofMatchesCheckoutPhone/);
    expect(checkout).toMatch(/setPhoneProof\(null\)/);
    expect(
      decideCheckoutOtpGate({
        otpRequired: true,
        proof: { proofId: "old", phoneLocal: "0501111111" },
        phone: "0502222222",
      })
    ).toEqual({ action: "open_otp" });
  });

  it("does not change checkout when OTP flag is off", () => {
    expect(
      decideCheckoutOtpGate({
        otpRequired: false,
        proof: null,
        phone: "0501234567",
      })
    ).toEqual({ action: "place" });
  });
});
