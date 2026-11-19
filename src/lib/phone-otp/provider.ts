/**
 * Selectable OTP SMS providers: Telnyx (next test) or Meser10 (kept).
 * Real sends only when PHONE_OTP_REAL_SMS is armed and mock is off.
 */
import type { IsraeliMobile } from "@/lib/phone/israeli-mobile";
import { assertPhoneAllowedForRealOtpSms } from "@/lib/phone-otp/config";
import { otpSmsText } from "@/lib/phone-otp/engine";
import { readMeser10Config, sendMeser10Sms } from "@/lib/phone-otp/meser10";
import { readTelnyxConfig, sendTelnyxSms } from "@/lib/phone-otp/telnyx";

export type OtpSmsProviderName = "telnyx" | "meser10";

export type OtpSmsSendResult =
  | { ok: true; status: string; messageId: string | null; provider: OtpSmsProviderName }
  | {
      ok: false;
      error: string;
      status: string | null;
      messageId: string | null;
      provider: OtpSmsProviderName;
      httpStatus?: number | null;
      providerCode?: string | null;
      providerTitle?: string | null;
    };

export function getOtpSmsProvider(env: NodeJS.ProcessEnv = process.env): OtpSmsProviderName {
  const raw = (env.OTP_SMS_PROVIDER || "telnyx").trim().toLowerCase();
  return raw === "meser10" ? "meser10" : "telnyx";
}

export function isOtpSmsProviderConfigured(
  env: NodeJS.ProcessEnv = process.env,
  provider: OtpSmsProviderName = getOtpSmsProvider(env)
): boolean {
  if (provider === "telnyx") return !!readTelnyxConfig(env);
  return !!readMeser10Config(env);
}

/**
 * Send digits-only OTP SMS via the selected provider.
 * Telnyx uses E.164; Meser10 uses Israeli local 05XXXXXXXX.
 */
export async function sendOtpSmsViaProvider(input: {
  phone: IsraeliMobile;
  code: string;
  env?: NodeJS.ProcessEnv;
}): Promise<OtpSmsSendResult> {
  const env = input.env || process.env;
  const provider = getOtpSmsProvider(env);
  const body = otpSmsText(input.code);
  if (!/^\d{6}$/.test(body)) {
    return {
      ok: false,
      error: "INVALID_MESSAGE",
      status: null,
      messageId: null,
      provider,
    };
  }

  // Defense in depth: never call Meser10/Telnyx for non-allowlisted staging numbers.
  const allow = assertPhoneAllowedForRealOtpSms(input.phone, env);
  if (!allow.ok) {
    return {
      ok: false,
      error: allow.code,
      status: null,
      messageId: null,
      provider,
    };
  }

  if (provider === "telnyx") {
    const sms = await sendTelnyxSms(input.phone.e164, body, readTelnyxConfig(env) || undefined);
    if (!sms.ok) {
      return {
        ok: false,
        error: sms.error,
        status: sms.status,
        messageId: sms.messageId,
        provider,
        httpStatus: "httpStatus" in sms ? sms.httpStatus : null,
        providerCode: "telnyxCode" in sms ? sms.telnyxCode : null,
        providerTitle: "telnyxTitle" in sms ? sms.telnyxTitle : null,
      };
    }
    return {
      ok: true,
      status: sms.status || "queued",
      messageId: sms.messageId,
      provider,
    };
  }

  const sms = await sendMeser10Sms(
    input.phone.local,
    body,
    readMeser10Config(env) || undefined
  );
  if (!sms.ok) {
    return {
      ok: false,
      error: sms.error,
      status: sms.status,
      messageId: sms.messageId,
      provider,
    };
  }
  return {
    ok: true,
    status: sms.status,
    messageId: sms.messageId,
    provider,
  };
}
