import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import {
  parseIsraeliMobile,
  type IsraeliMobile,
} from "@/lib/phone/israeli-mobile";
import { OTP_ERROR_TEXT, type OtpErrorCode } from "@/lib/phone-otp/messages";

export { parseIsraeliMobile, OTP_ERROR_TEXT };
export type { IsraeliMobile, OtpErrorCode };

export const OTP_TTL_MS = 5 * 60 * 1000;
export const PROOF_TTL_MS = 10 * 60 * 1000;
export const RESEND_WAIT_MS = 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;
export const MAX_SENDS_PER_PHONE_HOUR = 5;
export const MAX_SENDS_PER_IP_HOUR = 8;
export const SEND_WINDOW_MS = 60 * 60 * 1000;

export type SendLedger = {
  lastSentAt: number;
  windowStart: number;
  sendCount: number;
};

export function emptyLedger(): SendLedger {
  return { lastSentAt: 0, windowStart: 0, sendCount: 0 };
}

export function maskIsraeliPhone(local: string): string {
  if (!/^05\d{8}$/.test(local)) return "05****";
  return `${local.slice(0, 3)}****${local.slice(-3)}`;
}

export function generateOtpCode(nextInt: (max: number) => number = (max) => randomInt(max)): string {
  return String(nextInt(1_000_000)).padStart(6, "0");
}

/** SMS body must be exactly the 6-digit code — no brand, words, spaces, or newlines. Sender stays separate (Meser10 `FromName`). */
export function otpSmsText(code: string): string {
  const digits = String(code ?? "").replace(/\D/g, "").padStart(6, "0").slice(-6);
  return digits;
}

export function hashOtpCode(secret: string, challengeId: string, phoneE164: string, code: string): string {
  return createHmac("sha256", secret).update(`${phoneE164}|${challengeId}|${code}`).digest("hex");
}

export function otpCodesMatch(expectedHex: string, actualHex: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(expectedHex) || !/^[a-f0-9]{64}$/.test(actualHex)) return false;
  return timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(actualHex, "hex"));
}

export function evaluateSend(input: {
  now: number;
  phone: SendLedger;
  ip: SendLedger;
}):
  | { ok: true; phone: SendLedger; ip: SendLedger }
  | { ok: false; code: "RESEND_WAIT" | "RATE_LIMIT"; retryAfterSec: number } {
  const phone = rollWindow(input.phone, input.now);
  const ip = rollWindow(input.ip, input.now);
  if (phone.lastSentAt && input.now - phone.lastSentAt < RESEND_WAIT_MS) {
    return {
      ok: false,
      code: "RESEND_WAIT",
      retryAfterSec: Math.ceil((RESEND_WAIT_MS - (input.now - phone.lastSentAt)) / 1000),
    };
  }
  if (phone.sendCount >= MAX_SENDS_PER_PHONE_HOUR || ip.sendCount >= MAX_SENDS_PER_IP_HOUR) {
    const phoneLeft = SEND_WINDOW_MS - (input.now - phone.windowStart);
    const ipLeft = SEND_WINDOW_MS - (input.now - ip.windowStart);
    return {
      ok: false,
      code: "RATE_LIMIT",
      retryAfterSec: Math.max(1, Math.ceil(Math.min(phoneLeft, ipLeft) / 1000)),
    };
  }
  return {
    ok: true,
    phone: { lastSentAt: input.now, windowStart: phone.windowStart || input.now, sendCount: phone.sendCount + 1 },
    ip: { lastSentAt: input.now, windowStart: ip.windowStart || input.now, sendCount: ip.sendCount + 1 },
  };
}

function rollWindow(ledger: SendLedger, now: number): SendLedger {
  if (!ledger.windowStart || now - ledger.windowStart >= SEND_WINDOW_MS) {
    return { lastSentAt: ledger.lastSentAt, windowStart: now, sendCount: 0 };
  }
  return ledger;
}

export type ChallengeState = {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
  superseded: boolean;
  failedDelivery: boolean;
};

export function evaluateVerify(input: {
  challenge: ChallengeState | null;
  codeHash: string;
  now: number;
}): { ok: true } | { ok: false; code: OtpErrorCode; attempts?: number } {
  const challenge = input.challenge;
  if (!challenge || challenge.consumed || challenge.failedDelivery) return { ok: false, code: "INVALID_CODE" };
  if (challenge.superseded) return { ok: false, code: "SUPERSEDED" };
  if (input.now > challenge.expiresAt) return { ok: false, code: "EXPIRED" };
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, code: "TOO_MANY_ATTEMPTS" };
  if (!otpCodesMatch(challenge.codeHash, input.codeHash)) {
    const attempts = challenge.attempts + 1;
    return {
      ok: false,
      code: attempts >= MAX_VERIFY_ATTEMPTS ? "TOO_MANY_ATTEMPTS" : "INVALID_CODE",
      attempts,
    };
  }
  return { ok: true };
}

export type ProofState = {
  phoneE164: string;
  phoneLocal: string;
  expiresAt: number;
  used: boolean;
  usedByRequestId?: string;
};

/**
 * Single-use proof bound to phone + requestId.
 * Same requestId may reuse an already-claimed proof (Hyp SIGN retry / idempotent checkout).
 * A different requestId cannot reuse it.
 */
export function evaluateProof(input: {
  proof: ProofState | null;
  phoneE164: string;
  requestId: string;
  now: number;
}): { ok: true; alreadyUsedByRequest: boolean } | { ok: false; code: OtpErrorCode } {
  const proof = input.proof;
  if (!proof) return { ok: false, code: "PHONE_NOT_VERIFIED" };
  if (proof.phoneE164 !== input.phoneE164) return { ok: false, code: "PHONE_MISMATCH" };
  if (proof.used) {
    if (proof.usedByRequestId && proof.usedByRequestId === input.requestId) {
      return { ok: true, alreadyUsedByRequest: true };
    }
    return { ok: false, code: "PHONE_NOT_VERIFIED" };
  }
  if (input.now > proof.expiresAt) return { ok: false, code: "EXPIRED" };
  return { ok: true, alreadyUsedByRequest: false };
}

export function acceptedDeliveryStatus(status: string | null | undefined): boolean {
  return ["queued", "sending", "sent", "delivered", "delivery_unconfirmed"].includes(
    (status || "").toLowerCase()
  );
}

export function failedDeliveryStatus(status: string | null | undefined): boolean {
  return ["sending_failed", "delivery_failed", "delivery_unconfirmed_failed", "expired"].includes(
    (status || "").toLowerCase()
  );
}
