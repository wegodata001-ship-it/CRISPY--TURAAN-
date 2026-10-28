import { describe, expect, it } from "vitest";
import {
  evaluateProof,
  evaluateSend,
  evaluateVerify,
  generateOtpCode,
  hashOtpCode,
  maskIsraeliPhone,
  otpSmsText,
  parseIsraeliMobile,
  MAX_VERIFY_ATTEMPTS,
  OTP_TTL_MS,
  emptyLedger,
} from "@/lib/phone-otp/engine";
import { generateOrderNumber } from "@/lib/orders/order-number";

const secret = "test-secret";
const now = Date.parse("2026-10-28T12:00:00.000Z");

describe("phone otp", () => {
  it("converts an Israeli mobile number to E.164 and masks it", () => {
    expect(parseIsraeliMobile("0501234567")).toEqual({ local: "0501234567", e164: "+972501234567" });
    expect(parseIsraeliMobile("+972501234567")?.local).toBe("0501234567");
    expect(parseIsraeliMobile("12345")).toBeNull();
    expect(maskIsraeliPhone("0501234567")).toBe("050****567");
  });

  it("hashes the code and keeps it out of the SMS builder result", () => {
    const code = generateOtpCode(() => 123456);
    expect(code).toBe("123456");
    const hash = hashOtpCode(secret, "challenge", "+972501234567", code);
    expect(hash).not.toContain(code);
    expect(otpSmsText(code)).toContain("رمز التحقق الخاص بطلبك هو: 123456");
    expect(otpSmsText("654321")).not.toContain("123456");
  });

  it("accepts the right code once and rejects a wrong, expired, or replaced code", () => {
    const hash = hashOtpCode(secret, "challenge", "+972501234567", "123456");
    const challenge = {
      codeHash: hash,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      consumed: false,
      superseded: false,
      failedDelivery: false,
    };
    expect(evaluateVerify({ challenge, codeHash: hash, now }).ok).toBe(true);
    const wrong = evaluateVerify({
      challenge,
      codeHash: hashOtpCode(secret, "challenge", "+972501234567", "000000"),
      now,
    });
    expect(wrong).toMatchObject({ ok: false, code: "INVALID_CODE", attempts: 1 });
    expect(evaluateVerify({ challenge, codeHash: hash, now: now + OTP_TTL_MS + 1 })).toMatchObject({
      ok: false,
      code: "EXPIRED",
    });
    expect(evaluateVerify({ challenge: { ...challenge, superseded: true }, codeHash: hash, now })).toMatchObject({
      ok: false,
      code: "SUPERSEDED",
    });
    expect(
      evaluateVerify({ challenge: { ...challenge, attempts: MAX_VERIFY_ATTEMPTS }, codeHash: hash, now })
    ).toMatchObject({ ok: false, code: "TOO_MANY_ATTEMPTS" });
  });

  it("waits 60 seconds before another send and blocks the sixth send in an hour", () => {
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
    expect(evaluateSend({ now: phone.lastSentAt + 61_000, phone, ip })).toMatchObject({ ok: false, code: "RATE_LIMIT" });
  });

  it("refuses an order until the verified phone matches a fresh proof", () => {
    expect(evaluateProof({ proof: null, phoneE164: "+972501234567", requestId: "a", now }).ok).toBe(false);
    const proof = {
      phoneE164: "+972501234567",
      phoneLocal: "0501234567",
      expiresAt: now + 60_000,
      used: false,
    };
    expect(evaluateProof({ proof, phoneE164: "+972501234567", requestId: "a", now }).ok).toBe(true);
    expect(evaluateProof({ proof, phoneE164: "+972509999999", requestId: "a", now })).toMatchObject({
      ok: false,
      code: "PHONE_MISMATCH",
    });
    expect(
      evaluateProof({ proof: { ...proof, used: true, usedByRequestId: "a" }, phoneE164: proof.phoneE164, requestId: "b", now })
    ).toMatchObject({ ok: false, code: "PHONE_NOT_VERIFIED" });
    expect(
      evaluateProof({ proof: { ...proof, used: true, usedByRequestId: "a" }, phoneE164: proof.phoneE164, requestId: "a", now }).ok
    ).toBe(true);
  });

  it("keeps the existing order number shape", () => {
    const number = generateOrderNumber(new Date("2026-10-28T12:00:00.000Z"), () => 0.123456789);
    expect(number).toMatch(/^MC-2026-[A-Z0-9]{8}$/);
  });
});
