import { describe, expect, it, vi } from "vitest";
import { parseIsraeliMobile } from "@/lib/phone/israeli-mobile";
import {
  assertPhoneAllowedForRealOtpSms,
  isPhoneOtpStagingContext,
  parsePhoneOtpRealSmsAllowlist,
} from "@/lib/phone-otp/config";
import { sendOtpSmsViaProvider } from "@/lib/phone-otp/provider";

const stagingBase = {
  NEXT_PUBLIC_CRISPY_STAGING_MODE: "true",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "crispy-staging",
  FIREBASE_ADMIN_PROJECT_ID: "crispy-staging",
  PHONE_OTP_STAGING_MOCK: "false",
  PHONE_OTP_REAL_SMS: "true",
  OTP_SMS_PROVIDER: "meser10",
  MESER10_API_KEY: "test-key-not-real",
  MESER10_SENDER: "0546128311",
} as const;

const allowedLocal = "0546128311";
const otherLocal = "0501234567";

describe("phone OTP real-SMS allowlist (staging)", () => {
  it("parses allowlist entries into normalized 05 local numbers", () => {
    const set = parsePhoneOtpRealSmsAllowlist({
      PHONE_OTP_REAL_SMS_ALLOWLIST: "0546128311, +972501234567; 972547654321",
    });
    expect(set.has("0546128311")).toBe(true);
    expect(set.has("0501234567")).toBe(true);
    expect(set.has("0547654321")).toBe(true);
    expect(set.size).toBe(3);
  });

  it("detects crispy-staging context and ignores production-like env", () => {
    expect(isPhoneOtpStagingContext(stagingBase)).toBe(true);
    expect(
      isPhoneOtpStagingContext({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "crispy-d0bf7",
        FIREBASE_ADMIN_PROJECT_ID: "crispy-d0bf7",
      })
    ).toBe(false);
  });

  it("allows the allowlisted test number (including +972 form input already parsed)", () => {
    const fromLocal = parseIsraeliMobile(allowedLocal)!;
    const fromE164 = parseIsraeliMobile("+972546128311")!;
    expect(fromLocal.local).toBe(allowedLocal);
    expect(fromE164.local).toBe(allowedLocal);

    const env = { ...stagingBase, PHONE_OTP_REAL_SMS_ALLOWLIST: allowedLocal };
    expect(assertPhoneAllowedForRealOtpSms(fromLocal, env)).toEqual({ ok: true });
    expect(assertPhoneAllowedForRealOtpSms(fromE164, env)).toEqual({ ok: true });
  });

  it("rejects any other number before Meser10 would be called", async () => {
    const phone = parseIsraeliMobile(otherLocal)!;
    const env = { ...stagingBase, PHONE_OTP_REAL_SMS_ALLOWLIST: allowedLocal };
    expect(assertPhoneAllowedForRealOtpSms(phone, env)).toEqual({
      ok: false,
      code: "PHONE_NOT_ALLOWED",
    });

    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    try {
      const result = await sendOtpSmsViaProvider({
        phone,
        code: "123456",
        env: { ...env },
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe("PHONE_NOT_ALLOWED");
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("cannot bypass allowlist by using +972 instead of 05", () => {
    const env = {
      ...stagingBase,
      // Allowlist stores local form; request arrives as E.164 and is normalized first.
      PHONE_OTP_REAL_SMS_ALLOWLIST: allowedLocal,
    };
    const spoofOtherAsE164 = parseIsraeliMobile("+972501234567")!;
    expect(spoofOtherAsE164.local).toBe(otherLocal);
    expect(assertPhoneAllowedForRealOtpSms(spoofOtherAsE164, env)).toEqual({
      ok: false,
      code: "PHONE_NOT_ALLOWED",
    });

    // Allowlist itself may be written as +972 — still matches local 05.
    const envE164List = {
      ...stagingBase,
      PHONE_OTP_REAL_SMS_ALLOWLIST: "+972546128311",
    };
    const requestLocal = parseIsraeliMobile(allowedLocal)!;
    expect(assertPhoneAllowedForRealOtpSms(requestLocal, envE164List)).toEqual({ ok: true });
  });

  it("fail-closes staging real SMS when allowlist is missing or invalid", () => {
    const phone = parseIsraeliMobile(allowedLocal)!;
    expect(
      assertPhoneAllowedForRealOtpSms(phone, {
        ...stagingBase,
        PHONE_OTP_REAL_SMS_ALLOWLIST: "",
      })
    ).toEqual({ ok: false, code: "NOT_CONFIGURED" });
    expect(
      assertPhoneAllowedForRealOtpSms(phone, {
        ...stagingBase,
        PHONE_OTP_REAL_SMS_ALLOWLIST: "not-a-phone, 123",
      })
    ).toEqual({ ok: false, code: "NOT_CONFIGURED" });
  });

  it("does not change Production-like behavior (no staging allowlist gate)", () => {
    const phone = parseIsraeliMobile(otherLocal)!;
    const productionLike = {
      VERCEL_ENV: "production",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "crispy-d0bf7",
      FIREBASE_ADMIN_PROJECT_ID: "crispy-d0bf7",
      PHONE_OTP_REQUIRED: "false",
      PHONE_OTP_REAL_SMS: "false",
      PHONE_OTP_STAGING_MOCK: "false",
    };
    // OTP real SMS off → gate is a no-op (current Production posture).
    expect(assertPhoneAllowedForRealOtpSms(phone, productionLike)).toEqual({ ok: true });
    // Even if REAL_SMS were mistakenly true on non-staging, allowlist is staging-scoped only.
    expect(
      assertPhoneAllowedForRealOtpSms(phone, {
        ...productionLike,
        PHONE_OTP_REAL_SMS: "true",
        PHONE_OTP_REAL_SMS_ALLOWLIST: "",
      })
    ).toEqual({ ok: true });
  });

  it("mock mode leaves allowlist unused (real SMS still disabled)", () => {
    const phone = parseIsraeliMobile(otherLocal)!;
    expect(
      assertPhoneAllowedForRealOtpSms(phone, {
        ...stagingBase,
        PHONE_OTP_STAGING_MOCK: "true",
        PHONE_OTP_REAL_SMS: "false",
        PHONE_OTP_REAL_SMS_ALLOWLIST: allowedLocal,
      })
    ).toEqual({ ok: true });
  });
});
