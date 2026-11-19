import { parseIsraeliMobile } from "@/lib/phone/israeli-mobile";

export type PhoneOtpClientStatus = {
  required: boolean;
  mock: boolean;
};

export type VerifiedPhoneProof = {
  proofId: string;
  phoneLocal: string;
  maskedPhone?: string;
};

/** True when storefront must collect phoneProof before placing a new order. */
export function checkoutRequiresPhoneOtp(status: PhoneOtpClientStatus | null | undefined): boolean {
  return status?.required === true;
}

export function proofMatchesCheckoutPhone(
  proof: VerifiedPhoneProof | null | undefined,
  phoneInput: string
): boolean {
  if (!proof?.proofId) return false;
  const parsed = parseIsraeliMobile(phoneInput);
  if (!parsed) return false;
  return parsed.local === proof.phoneLocal;
}

/**
 * Keep requestId on Hyp SIGN / link failures so the server can replay the same
 * checkout request (and the already-claimed phoneProof) without a second OTP.
 */
export function shouldRotateCheckoutRequestId(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false;
  if (errorCode === "HYP_PAYMENT_LINK_FAILED") return false;
  return errorCode === "HYP_NOT_CONFIGURED";
}

export function buildCheckoutPhoneProofPayload(input: {
  otpRequired: boolean;
  proof: VerifiedPhoneProof | null | undefined;
  phone: string;
}): { ok: true; phoneProof?: string } | { ok: false; code: "PHONE_NOT_VERIFIED" | "PHONE_MISMATCH" | "INVALID_PHONE" } {
  const parsed = parseIsraeliMobile(input.phone);
  if (!parsed) return { ok: false, code: "INVALID_PHONE" };
  if (!input.otpRequired) return { ok: true };
  if (!input.proof?.proofId) return { ok: false, code: "PHONE_NOT_VERIFIED" };
  if (input.proof.phoneLocal !== parsed.local) return { ok: false, code: "PHONE_MISMATCH" };
  return { ok: true, phoneProof: input.proof.proofId };
}

/**
 * Confirm-order gate: validate cart/details first, then either place the order
 * or open the OTP dialog (auto-send). Never requires a separate "verify phone" button.
 */
export type CheckoutOtpGateDecision =
  | { action: "place"; phoneProof?: string }
  | { action: "open_otp" }
  | { action: "error"; code: "INVALID_PHONE" };

export function decideCheckoutOtpGate(input: {
  otpRequired: boolean;
  proof: VerifiedPhoneProof | null | undefined;
  phone: string;
}): CheckoutOtpGateDecision {
  const parsed = parseIsraeliMobile(input.phone);
  if (!parsed) return { action: "error", code: "INVALID_PHONE" };
  if (!input.otpRequired) return { action: "place" };
  if (!input.proof?.proofId || input.proof.phoneLocal !== parsed.local) {
    return { action: "open_otp" };
  }
  return { action: "place", phoneProof: input.proof.proofId };
}
