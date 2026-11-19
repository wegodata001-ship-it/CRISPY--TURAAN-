import { describe, expect, it } from "vitest";
import {
  canExposePhoneOtpDevCode,
  getPhoneOtpHmacSecret,
  isPhoneOtpMockEnabled,
  isPhoneOtpRealSmsEnabled,
  isPhoneOtpRequired,
} from "@/lib/phone-otp/config";
import {
  claimPhoneProofForNewOrder,
  missingPhoneProofError,
} from "@/lib/phone-otp/checkout-gate";
import {
  OTP_TTL_MS,
  MAX_VERIFY_ATTEMPTS,
  emptyLedger,
  evaluateProof,
  evaluateSend,
  evaluateVerify,
  generateOtpCode,
  hashOtpCode,
  maskIsraeliPhone,
  otpSmsText,
  parseIsraeliMobile,
} from "@/lib/phone-otp/engine";

const secret = "test-secret-not-meser10";
const now = Date.parse("2026-11-09T08:00:00.000Z");

describe("phone otp flags", () => {
  it("keeps OTP optional and mock-only by default (Meser10 prep)", () => {
    expect(isPhoneOtpRequired({})).toBe(false);
    expect(isPhoneOtpRequired({ PHONE_OTP_REQUIRED: "false" })).toBe(false);
    expect(isPhoneOtpRequired({ PHONE_OTP_REQUIRED: "true" })).toBe(true);
    expect(isPhoneOtpMockEnabled({})).toBe(true);
    expect(isPhoneOtpRealSmsEnabled({})).toBe(false);
    expect(
      isPhoneOtpRealSmsEnabled({
        PHONE_OTP_REAL_SMS: "true",
        PHONE_OTP_STAGING_MOCK: "true",
      })
    ).toBe(false);
    expect(
      isPhoneOtpRealSmsEnabled({
        PHONE_OTP_REAL_SMS: "true",
        PHONE_OTP_STAGING_MOCK: "false",
      })
    ).toBe(true);
    expect(getPhoneOtpHmacSecret({})).toBe("crispy-phone-otp-mock-dev-only");
    expect(
      getPhoneOtpHmacSecret({
        PHONE_OTP_REAL_SMS: "true",
        PHONE_OTP_STAGING_MOCK: "false",
        OTP_SECRET: "short",
      })
    ).toBeNull();
    expect(
      getPhoneOtpHmacSecret({
        PHONE_OTP_REAL_SMS: "true",
        PHONE_OTP_STAGING_MOCK: "false",
        OTP_SECRET: "sixteen-chars-ok!",
      })
    ).toBe("sixteen-chars-ok!");
    expect(
      canExposePhoneOtpDevCode({
        PHONE_OTP_STAGING_MOCK: "true",
        PHONE_OTP_REAL_SMS: "false",
      })
    ).toBe(true);
    expect(
      canExposePhoneOtpDevCode({
        PHONE_OTP_STAGING_MOCK: "false",
        PHONE_OTP_REAL_SMS: "false",
      })
    ).toBe(false);
    expect(
      canExposePhoneOtpDevCode({
        PHONE_OTP_STAGING_MOCK: "true",
        VERCEL_ENV: "production",
      })
    ).toBe(false);
  });
});

describe("phone otp engine", () => {
  it("parses Israeli mobiles and masks them", () => {
    expect(parseIsraeliMobile("0501234567")).toEqual({ local: "0501234567", e164: "+972501234567" });
    expect(parseIsraeliMobile("+972501234567")?.local).toBe("0501234567");
    expect(parseIsraeliMobile("12345")).toBeNull();
    expect(maskIsraeliPhone("0501234567")).toBe("050****567");
  });

  it("accepts the correct code and rejects wrong / expired / superseded", () => {
    const code = generateOtpCode(() => 123456);
    expect(code).toBe("123456");
    const hash = hashOtpCode(secret, "challenge", "+972501234567", code);
    expect(hash).not.toContain(code);
    expect(otpSmsText(code)).toBe("123456");
    expect(otpSmsText("483921")).toBe("483921");
    expect(otpSmsText("004821")).toBe("004821");
    expect(otpSmsText("4821")).toBe("004821");
    expect(otpSmsText("004821")).toMatch(/^\d{6}$/);
    expect(otpSmsText("004821")).not.toMatch(/[^\d]/);
    expect(otpSmsText("123456")).not.toContain("CRISPY");
    expect(otpSmsText("123456")).not.toContain("\n");
    expect(otpSmsText("123456")).not.toContain(" ");

    const challenge = {
      codeHash: hash,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      consumed: false,
      superseded: false,
      failedDelivery: false,
    };
    expect(evaluateVerify({ challenge, codeHash: hash, now }).ok).toBe(true);
    expect(
      evaluateVerify({
        challenge,
        codeHash: hashOtpCode(secret, "challenge", "+972501234567", "000000"),
        now,
      })
    ).toMatchObject({ ok: false, code: "INVALID_CODE", attempts: 1 });
    expect(evaluateVerify({ challenge, codeHash: hash, now: now + OTP_TTL_MS + 1 })).toMatchObject({
      ok: false,
      code: "EXPIRED",
    });
    expect(
      evaluateVerify({ challenge: { ...challenge, superseded: true }, codeHash: hash, now })
    ).toMatchObject({ ok: false, code: "SUPERSEDED" });
    expect(
      evaluateVerify({
        challenge: { ...challenge, attempts: MAX_VERIFY_ATTEMPTS },
        codeHash: hash,
        now,
      })
    ).toMatchObject({ ok: false, code: "TOO_MANY_ATTEMPTS" });
  });

  it("enforces 60s resend wait and hourly send caps", () => {
    const first = evaluateSend({ now, phone: emptyLedger(), ip: emptyLedger() });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(evaluateSend({ now: now + 10_000, phone: first.phone, ip: first.ip })).toMatchObject({
      ok: false,
      code: "RESEND_WAIT",
    });
    let phone = first.phone;
    let ip = first.ip;
    for (let i = 0; i < 4; i += 1) {
      const next = evaluateSend({ now: phone.lastSentAt + 61_000, phone, ip });
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      phone = next.phone;
      ip = next.ip;
    }
    expect(evaluateSend({ now: phone.lastSentAt + 61_000, phone, ip })).toMatchObject({
      ok: false,
      code: "RATE_LIMIT",
    });
  });

  it("binds proof to phone and allows only one new order use", () => {
    const proof = {
      phoneE164: "+972501234567",
      phoneLocal: "0501234567",
      expiresAt: now + 60_000,
      used: false,
    };
    expect(evaluateProof({ proof, phoneE164: proof.phoneE164, requestId: "req-a", now }).ok).toBe(true);
    expect(
      evaluateProof({ proof, phoneE164: "+972509999999", requestId: "req-a", now })
    ).toMatchObject({ ok: false, code: "PHONE_MISMATCH" });
    expect(
      evaluateProof({
        proof: { ...proof, used: true, usedByRequestId: "req-a" },
        phoneE164: proof.phoneE164,
        requestId: "req-b",
        now,
      })
    ).toMatchObject({ ok: false, code: "PHONE_NOT_VERIFIED" });
    expect(
      evaluateProof({
        proof: { ...proof, used: true, usedByRequestId: "req-a" },
        phoneE164: proof.phoneE164,
        requestId: "req-a",
        now,
      })
    ).toEqual({ ok: true, alreadyUsedByRequest: true });
    expect(
      evaluateProof({
        proof: { ...proof, expiresAt: now - 1 },
        phoneE164: proof.phoneE164,
        requestId: "req-a",
        now,
      })
    ).toMatchObject({ ok: false, code: "EXPIRED" });
  });
});

describe("phone otp checkout gate", () => {
  it("does not require proof when the flag is off", () => {
    expect(
      missingPhoneProofError({
        phoneProof: null,
        checkoutRequestExists: false,
        env: { PHONE_OTP_REQUIRED: "false" },
      })
    ).toEqual({ ok: true, proofId: null });
  });

  it("requires proof for a new checkout when the flag is on", () => {
    expect(
      missingPhoneProofError({
        phoneProof: "",
        checkoutRequestExists: false,
        env: { PHONE_OTP_REQUIRED: "true" },
      })
    ).toEqual({ ok: false, code: "PHONE_NOT_VERIFIED" });
    expect(
      missingPhoneProofError({
        phoneProof: "proof-1",
        checkoutRequestExists: false,
        env: { PHONE_OTP_REQUIRED: "true" },
      })
    ).toEqual({ ok: true, proofId: "proof-1" });
  });

  it("allows Hyp SIGN / idempotent retry without a new proof when requestId already exists", () => {
    expect(
      missingPhoneProofError({
        phoneProof: null,
        checkoutRequestExists: true,
        env: { PHONE_OTP_REQUIRED: "true" },
      })
    ).toEqual({ ok: true, proofId: null });
  });

  it("rejects reusing a consumed proof for a different requestId on new order create", () => {
    const claimed = claimPhoneProofForNewOrder({
      proof: {
        phoneE164: "+972501234567",
        phoneLocal: "0501234567",
        expiresAt: now + 60_000,
        used: true,
        usedByRequestId: "req-a",
      },
      phone: "0501234567",
      requestId: "req-b",
      now,
    });
    expect(claimed).toMatchObject({ ok: false, code: "PHONE_NOT_VERIFIED" });
  });

  it("rejects phone mismatch on new order claim", () => {
    expect(
      claimPhoneProofForNewOrder({
        proof: {
          phoneE164: "+972501234567",
          phoneLocal: "0501234567",
          expiresAt: now + 60_000,
          used: false,
        },
        phone: "0509999999",
        requestId: "req-a",
        now,
      })
    ).toMatchObject({ ok: false, code: "PHONE_MISMATCH" });
  });
});
