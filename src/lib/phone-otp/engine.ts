import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const PROOF_TTL_MS = 10 * 60 * 1000;
export const RESEND_WAIT_MS = 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;
export const MAX_SENDS_PER_PHONE_HOUR = 5;
export const MAX_SENDS_PER_IP_HOUR = 8;
export const SEND_WINDOW_MS = 60 * 60 * 1000;

export type OtpErrorCode =
  | "INVALID_PHONE"
  | "RESEND_WAIT"
  | "RATE_LIMIT"
  | "INVALID_CODE"
  | "EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "SUPERSEDED"
  | "PHONE_NOT_VERIFIED"
  | "PHONE_MISMATCH"
  | "SEND_FAILED"
  | "DELIVERY_FAILED"
  | "NOT_CONFIGURED";

export type IsraeliMobile = {
  local: string;
  e164: string;
};

export type SendLedger = {
  lastSentAt: number;
  windowStart: number;
  sendCount: number;
};

export function emptyLedger(): SendLedger {
  return { lastSentAt: 0, windowStart: 0, sendCount: 0 };
}

export function parseIsraeliMobile(input: string): IsraeliMobile | null {
  const compact = input.trim().replace(/[^\d+]/g, "");
  let local = "";
  if (/^05\d{8}$/.test(compact)) local = compact;
  else if (/^\+9725\d{8}$/.test(compact)) local = `0${compact.slice(4)}`;
  else if (/^9725\d{8}$/.test(compact)) local = `0${compact.slice(3)}`;
  if (!/^05\d{8}$/.test(local)) return null;
  return { local, e164: `+972${local.slice(1)}` };
}

export function maskIsraeliPhone(local: string): string {
  if (!/^05\d{8}$/.test(local)) return "05****";
  return `${local.slice(0, 3)}****${local.slice(-3)}`;
}

export function generateOtpCode(nextInt: (max: number) => number = (max) => randomInt(max)): string {
  return String(nextInt(1_000_000)).padStart(6, "0");
}

export function otpSmsText(code: string): string {
  return [
    "CRISPY",
    `رمز التحقق الخاص بطلبك هو: ${code}`,
    "الرمز صالح لمدة 5 دقائق.",
    "لا تشارك الرمز مع أي شخص.",
  ].join("\n");
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
    return { ok: false, code: "RATE_LIMIT", retryAfterSec: Math.max(1, Math.ceil(Math.min(phoneLeft, ipLeft) / 1000)) };
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
    return { ok: false, code: attempts >= MAX_VERIFY_ATTEMPTS ? "TOO_MANY_ATTEMPTS" : "INVALID_CODE", attempts };
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

export const OTP_ERROR_TEXT: Record<OtpErrorCode, { ar: string; he: string; en: string }> = {
  INVALID_PHONE: {
    ar: "أدخل رقم هاتف إسرائيلي بصيغة 05XXXXXXXX",
    he: "יש להזין מספר ישראלי בפורמט 05XXXXXXXX",
    en: "Enter an Israeli mobile number as 05XXXXXXXX",
  },
  RESEND_WAIT: {
    ar: "يمكن طلب رمز جديد بعد انتهاء المؤقت",
    he: "אפשר לבקש קוד חדש אחרי סיום הטיימר",
    en: "You can request a new code when the timer ends",
  },
  RATE_LIMIT: {
    ar: "تم إيقاف الإرسال مؤقتاً لحماية الحساب. حاول لاحقاً",
    he: "השליחה הושהתה זמנית. נסו שוב מאוחר יותר",
    en: "Sending is temporarily paused. Try again later",
  },
  INVALID_CODE: {
    ar: "رمز التحقق غير صحيح",
    he: "קוד האימות שגוי",
    en: "The verification code is incorrect",
  },
  EXPIRED: {
    ar: "انتهت صلاحية رمز التحقق",
    he: "פג תוקף קוד האימות",
    en: "The verification code has expired",
  },
  TOO_MANY_ATTEMPTS: {
    ar: "تم تجاوز عدد المحاولات. اطلب رمزاً جديداً",
    he: "חרגתם ממספר הניסיונות. בקשו קוד חדש",
    en: "Too many attempts. Request a new code",
  },
  SUPERSEDED: {
    ar: "تم إلغاء هذا الرمز. استخدم الرمز الأخير الذي أُرسل",
    he: "הקוד הזה בוטל. השתמשו בקוד האחרון שנשלח",
    en: "This code was replaced. Use the latest code",
  },
  PHONE_NOT_VERIFIED: {
    ar: "يجب تأكيد رقم الهاتف قبل إرسال الطلب",
    he: "יש לאמת את הטלפון לפני שליחת ההזמנה",
    en: "Verify the phone number before placing the order",
  },
  PHONE_MISMATCH: {
    ar: "رقم الهاتف لا يطابق الرقم الذي تم التحقق منه",
    he: "מספר הטלפון לא תואם למספר שאומת",
    en: "The phone number does not match the verified number",
  },
  SEND_FAILED: {
    ar: "تعذر إرسال الرسالة. حاول مرة أخرى",
    he: "לא הצלחנו לשלוח את ההודעה. נסו שוב",
    en: "The message could not be sent. Try again",
  },
  DELIVERY_FAILED: {
    ar: "لم يؤكد مزود الرسائل تسليم الرمز",
    he: "ספק ההודעות לא אישר את מסירת הקוד",
    en: "The SMS provider did not confirm delivery",
  },
  NOT_CONFIGURED: {
    ar: "إرسال الرسائل غير مُعد على الخادم",
    he: "שליחת ההודעות לא הוגדרה בשרת",
    en: "SMS sending is not configured on the server",
  },
};

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
