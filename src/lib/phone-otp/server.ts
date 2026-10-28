import { createHash, randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  OTP_TTL_MS,
  PROOF_TTL_MS,
  emptyLedger,
  evaluateProof,
  evaluateSend,
  evaluateVerify,
  generateOtpCode,
  hashOtpCode,
  otpSmsText,
  parseIsraeliMobile,
  type ProofState,
  type SendLedger,
} from "@/lib/phone-otp/engine";
import { readTelnyxConfig, sendTelnyxSms } from "@/lib/phone-otp/telnyx";

function challenges() {
  return getAdminDb().collection(COLLECTIONS.phoneOtps);
}

function phoneIndex() {
  return getAdminDb().collection(COLLECTIONS.phoneOtpIndex);
}

function ipLimits() {
  return getAdminDb().collection(COLLECTIONS.phoneOtpIps);
}

export function phoneVerificationRef(proofId: string) {
  return getAdminDb().collection(COLLECTIONS.phoneVerifications).doc(proofId);
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function ledgerFrom(data: FirebaseFirestore.DocumentData | undefined): SendLedger {
  if (!data) return emptyLedger();
  return {
    lastSentAt: Number(data.lastSentAt) || 0,
    windowStart: Number(data.windowStart) || 0,
    sendCount: Number(data.sendCount) || 0,
  };
}

export async function sendPhoneOtp(input: { phone: string; ip: string }) {
  const parsed = parseIsraeliMobile(input.phone);
  if (!parsed) return { ok: false as const, code: "INVALID_PHONE" as const };
  const config = readTelnyxConfig();
  if (!config) return { ok: false as const, code: "NOT_CONFIGURED" as const };
  const secret = config.apiKey;
  const now = Date.now();
  const phoneKey = digest(parsed.e164);
  const ipKey = digest(input.ip || "unknown");
  const db = getAdminDb();
  const prepared = await db.runTransaction(async (tx) => {
    const phoneRef = phoneIndex().doc(phoneKey);
    const ipRef = ipLimits().doc(ipKey);
    const phoneSnap = await tx.get(phoneRef);
    const ipSnap = await tx.get(ipRef);
    const decision = evaluateSend({
      now,
      phone: ledgerFrom(phoneSnap.data()),
      ip: ledgerFrom(ipSnap.data()),
    });
    if (!decision.ok) return decision;
    const previousId = phoneSnap.exists ? String(phoneSnap.data()?.challengeId || "") : "";
    const challengeId = randomUUID();
    const code = generateOtpCode();
    if (previousId) {
      tx.set(challenges().doc(previousId), { superseded: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    tx.set(challenges().doc(challengeId), {
      phoneE164: parsed.e164,
      phoneLocal: parsed.local,
      codeHash: hashOtpCode(secret, challengeId, parsed.e164, code),
      createdAt: Timestamp.now(),
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      consumed: false,
      superseded: false,
      failedDelivery: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(phoneRef, { ...decision.phone, challengeId }, { merge: true });
    tx.set(ipRef, decision.ip, { merge: true });
    return { ok: true as const, challengeId, code, phone: parsed };
  });
  if (!prepared.ok) return prepared;
  const sms = await sendTelnyxSms(prepared.phone.e164, otpSmsText(prepared.code), config);
  if (!sms.ok) {
    await challenges().doc(prepared.challengeId).set(
      { failedDelivery: true, telnyxStatus: sms.status, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { ok: false as const, code: sms.error === "DELIVERY_FAILED" ? ("DELIVERY_FAILED" as const) : ("SEND_FAILED" as const) };
  }
  await challenges().doc(prepared.challengeId).set(
    { telnyxMessageId: sms.messageId, telnyxStatus: sms.status, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return {
    ok: true as const,
    challengeId: prepared.challengeId,
    phoneLocal: prepared.phone.local,
    expiresInSec: OTP_TTL_MS / 1000,
    resendInSec: 60,
    deliveryStatus: sms.status,
  };
}

export async function verifyPhoneOtp(input: { challengeId: string; code: string }) {
  const config = readTelnyxConfig();
  if (!config) return { ok: false as const, code: "NOT_CONFIGURED" as const };
  const challengeId = input.challengeId.trim();
  const code = input.code.replace(/\D/g, "");
  if (!challengeId || !/^\d{6}$/.test(code)) return { ok: false as const, code: "INVALID_CODE" as const };
  const now = Date.now();
  const proofId = randomUUID();
  const result = await getAdminDb().runTransaction(async (tx) => {
    const ref = challenges().doc(challengeId);
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false as const, code: "INVALID_CODE" as const };
    const data = snap.data() || {};
    const phoneE164 = String(data.phoneE164 || "");
    const decision = evaluateVerify({
      challenge: {
        codeHash: String(data.codeHash || ""),
        expiresAt: Number(data.expiresAt) || 0,
        attempts: Number(data.attempts) || 0,
        consumed: data.consumed === true,
        superseded: data.superseded === true,
        failedDelivery: data.failedDelivery === true,
      },
      codeHash: hashOtpCode(config.apiKey, challengeId, phoneE164, code),
      now,
    });
    if (!decision.ok) {
      if (decision.attempts) tx.update(ref, { attempts: decision.attempts, updatedAt: FieldValue.serverTimestamp() });
      return decision;
    }
    tx.update(ref, { consumed: true, updatedAt: FieldValue.serverTimestamp() });
    tx.set(phoneVerificationRef(proofId), {
      phoneE164,
      phoneLocal: String(data.phoneLocal || ""),
      expiresAt: now + PROOF_TTL_MS,
      used: false,
      challengeId,
      createdAt: Timestamp.now(),
    });
    return { ok: true as const, phoneLocal: String(data.phoneLocal || "") };
  });
  if (!result.ok) return result;
  return { ok: true as const, proofId, phoneLocal: result.phoneLocal, expiresInSec: PROOF_TTL_MS / 1000 };
}

export function proofStateFrom(data: FirebaseFirestore.DocumentData | undefined): ProofState | null {
  if (!data) return null;
  return {
    phoneE164: String(data.phoneE164 || ""),
    phoneLocal: String(data.phoneLocal || ""),
    expiresAt: Number(data.expiresAt) || 0,
    used: data.used === true,
    usedByRequestId: data.usedByRequestId ? String(data.usedByRequestId) : undefined,
  };
}

export function claimPhoneProof(input: {
  proof: ProofState | null;
  phone: string;
  requestId: string;
  now?: number;
}) {
  const parsed = parseIsraeliMobile(input.phone);
  if (!parsed) return { ok: false as const, code: "INVALID_PHONE" as const };
  return evaluateProof({
    proof: input.proof,
    phoneE164: parsed.e164,
    requestId: input.requestId,
    now: input.now ?? Date.now(),
  });
}
