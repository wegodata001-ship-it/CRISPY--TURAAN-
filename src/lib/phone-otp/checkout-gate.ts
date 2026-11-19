import { isPhoneOtpRequired } from "@/lib/phone-otp/config";
import {
  evaluateProof,
  parseIsraeliMobile,
  type OtpErrorCode,
  type ProofState,
} from "@/lib/phone-otp/engine";

/**
 * Whether checkout must receive a phoneProof for a *new* order.
 * Idempotent retries (existing checkout request) skip this — proof already bound to requestId.
 */
export function phoneProofRequiredForNewCheckout(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isPhoneOtpRequired(env);
}

export function missingPhoneProofError(input: {
  phoneProof?: string | null;
  checkoutRequestExists: boolean;
  env?: NodeJS.ProcessEnv;
}): { ok: true; proofId: string | null } | { ok: false; code: "PHONE_NOT_VERIFIED" } {
  const required = phoneProofRequiredForNewCheckout(input.env);
  const proofId = (input.phoneProof || "").trim();
  if (!required) return { ok: true, proofId: proofId || null };
  if (proofId) return { ok: true, proofId };
  // Existing requestId → Hyp SIGN / print retry; proof was claimed on first persist.
  if (input.checkoutRequestExists) return { ok: true, proofId: null };
  return { ok: false, code: "PHONE_NOT_VERIFIED" };
}

/**
 * Claim rules for creating a brand-new order inside a Firestore transaction.
 * Rejects alreadyUsedByRequest here so a second order cannot share a proof;
 * same-requestId retries must hit the checkout-request idempotency path instead.
 */
export function claimPhoneProofForNewOrder(input: {
  proof: ProofState | null;
  phone: string;
  requestId: string;
  now?: number;
}):
  | { ok: true }
  | { ok: false; code: OtpErrorCode } {
  const parsed = parseIsraeliMobile(input.phone);
  if (!parsed) return { ok: false, code: "INVALID_PHONE" };
  const decision = evaluateProof({
    proof: input.proof,
    phoneE164: parsed.e164,
    requestId: input.requestId,
    now: input.now ?? Date.now(),
  });
  if (!decision.ok) return decision;
  if (decision.alreadyUsedByRequest) {
    return { ok: false, code: "PHONE_NOT_VERIFIED" };
  }
  return { ok: true };
}
