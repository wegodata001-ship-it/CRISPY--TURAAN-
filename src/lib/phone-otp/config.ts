/**
 * Phone OTP feature flags (server-only).
 * Default: REQUIRED=false and REAL_SMS=false → live customers unchanged; mock path for tests.
 * Providers: Telnyx (default for next tests) or Meser10. Never put API keys in client code.
 */
import { parseIsraeliMobile, type IsraeliMobile } from "@/lib/phone/israeli-mobile";
import type { OtpErrorCode } from "@/lib/phone-otp/messages";

function flagTrue(raw: string | undefined): boolean {
  return (raw || "").trim().toLowerCase() === "true";
}

/** When false (default), checkout works without phoneProof — live customers unchanged. */
export function isPhoneOtpRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return flagTrue(env.PHONE_OTP_REQUIRED);
}

/**
 * Real SMS is opt-in only. Default: mock (no network SMS).
 * Even if TELNYX_* / MESER10_* secrets exist, they are unused unless this is true AND mock is false.
 */
export function isPhoneOtpRealSmsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (flagTrue(env.PHONE_OTP_STAGING_MOCK)) return false;
  return flagTrue(env.PHONE_OTP_REAL_SMS);
}

export function isPhoneOtpMockEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isPhoneOtpRealSmsEnabled(env);
}

/**
 * Staging-only context for real-SMS allowlist enforcement.
 * Production / non-staging storefront behavior stays unchanged (no allowlist gate).
 */
export function isPhoneOtpStagingContext(env: NodeJS.ProcessEnv = process.env): boolean {
  if (flagTrue(env.NEXT_PUBLIC_CRISPY_STAGING_MODE)) return true;
  const project = (
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    env.FIREBASE_ADMIN_PROJECT_ID ||
    env.FIREBASE_PROJECT_ID ||
    ""
  ).trim();
  return project === "crispy-staging";
}

/**
 * Parse PHONE_OTP_REAL_SMS_ALLOWLIST into normalized Israeli local numbers (05XXXXXXXX).
 * Accepts comma / whitespace / semicolon separators and +972 / 972 / 05 forms.
 */
export function parsePhoneOtpRealSmsAllowlist(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const raw = (env.PHONE_OTP_REAL_SMS_ALLOWLIST || "").trim();
  const out = new Set<string>();
  if (!raw) return out;
  for (const part of raw.split(/[,;\s]+/)) {
    const token = part.trim();
    if (!token) continue;
    const parsed = parseIsraeliMobile(token);
    if (parsed) out.add(parsed.local);
  }
  return out;
}

/**
 * Staging real-SMS gate (server-side, fail closed).
 * - Mock / non-real path: always ok (allowlist unused).
 * - Non-staging (e.g. Production defaults): ok without allowlist — current behavior unchanged.
 * - Staging + real SMS: require a non-empty valid allowlist and an exact local match.
 */
export function assertPhoneAllowedForRealOtpSms(
  phone: IsraeliMobile,
  env: NodeJS.ProcessEnv = process.env
): { ok: true } | { ok: false; code: Extract<OtpErrorCode, "NOT_CONFIGURED" | "PHONE_NOT_ALLOWED"> } {
  if (!isPhoneOtpRealSmsEnabled(env)) return { ok: true };
  if (!isPhoneOtpStagingContext(env)) return { ok: true };

  const allowed = parsePhoneOtpRealSmsAllowlist(env);
  if (allowed.size === 0) {
    return { ok: false, code: "NOT_CONFIGURED" };
  }
  if (!allowed.has(phone.local)) {
    return { ok: false, code: "PHONE_NOT_ALLOWED" };
  }
  return { ok: true };
}

/**
 * Mock OTP plaintext may appear in API/UI only during explicit local/staging QA.
 * Never on Vercel Production, never when real SMS is armed.
 */
export function canExposePhoneOtpDevCode(env: NodeJS.ProcessEnv = process.env): boolean {
  if ((env.VERCEL_ENV || "").trim().toLowerCase() === "production") return false;
  if (flagTrue(env.HYP_PAY_PRODUCTION_ENABLED)) return false;
  if (isPhoneOtpRealSmsEnabled(env)) return false;
  // Explicit mock QA flag required — default mock-without-SMS must not leak codes in prod builds.
  return flagTrue(env.PHONE_OTP_STAGING_MOCK);
}

/** HMAC secret for hashing OTP codes — never log this. */
export function getPhoneOtpHmacSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  if (isPhoneOtpMockEnabled(env)) {
    const mock = (env.PHONE_OTP_MOCK_SECRET || "").trim();
    // Deterministic non-production secret for mock hashing only (not a provider key).
    return mock || "crispy-phone-otp-mock-dev-only";
  }
  const secret = (env.OTP_SECRET || "").trim();
  return secret.length >= 16 ? secret : null;
}
