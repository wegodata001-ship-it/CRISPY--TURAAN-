/**
 * Meser10 SMS transport for OTP.
 * Docs: https://www.meser10.co.il/guides/otp-developers/
 *         https://www.meser10.co.il/en/otp/
 *
 * MessageBody must be digits-only (the 6-digit code). Sender is FromName (approved identity).
 * Never log ApiKey. ErrorCode 1 must not be retried (IP lockout).
 */

const MESER10_SMS_URL =
  "https://heb.mesereser.com/Services/JsonServices.aspx?f=SendSingleSmsMessage";

export type Meser10Config = {
  apiKey: string;
  sender: string;
  userAgent: string;
};

export function readMeser10Config(env: NodeJS.ProcessEnv = process.env): Meser10Config | null {
  const apiKey = (env.MESER10_API_KEY || "").trim();
  const sender = (env.MESER10_SENDER || "CRISPY").trim();
  const userAgent = (env.MESER10_USER_AGENT || "crispy-otp/1.0").trim();
  if (!apiKey || !sender) return null;
  if (sender.length > 11) return null;
  return { apiKey, sender, userAgent };
}

export type Meser10SendResult =
  | { ok: true; status: string; messageId: string | null }
  | { ok: false; error: string; status: string | null; messageId: string | null; errorCode?: string };

/**
 * Send a single SMS via Meser10 JsonServices.
 * `toPhone` should be Israeli local (05XXXXXXXX) — matches Meser10 examples.
 * `messageBody` must already be the digits-only OTP text.
 */
export async function sendMeser10Sms(
  toPhone: string,
  messageBody: string,
  config = readMeser10Config(),
  fetchImpl: typeof fetch = fetch
): Promise<Meser10SendResult> {
  if (!config) {
    return { ok: false, error: "NOT_CONFIGURED", status: null, messageId: null };
  }
  // Strict: body must already be exactly 6 digits — never strip extra words into a send.
  if (!/^\d{6}$/.test(String(messageBody ?? ""))) {
    return { ok: false, error: "INVALID_MESSAGE", status: null, messageId: null };
  }
  const digitsOnly = String(messageBody);

  try {
    const response = await fetchImpl(MESER10_SMS_URL, {
      method: "POST",
      headers: {
        ApiKey: config.apiKey,
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": config.userAgent,
      },
      body: JSON.stringify({
        ToPhone: toPhone,
        MessageBody: digitsOnly,
        FromName: config.sender,
      }),
      cache: "no-store",
    });

    const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const errorCode = normalizeErrorCode(raw?.ErrorCode);
    const messageId =
      raw?.MessageID != null && String(raw.MessageID) !== "0" ? String(raw.MessageID) : null;

    // Cloudflare / network: non-JSON or hard HTTP failures
    if (!response.ok && errorCode === null) {
      return {
        ok: false,
        error: `HTTP_${response.status}`,
        status: String(response.status),
        messageId: null,
      };
    }

    if (errorCode === "0") {
      return { ok: true, status: "sent", messageId };
    }

    // Auth failure — caller must NOT retry (IP lockout risk).
    if (errorCode === "1") {
      return {
        ok: false,
        error: "AUTH_FAILED",
        status: errorCode,
        messageId,
        errorCode,
      };
    }

    // 4 = bad params / unapproved sender — do not treat as transient.
    if (errorCode === "4") {
      return {
        ok: false,
        error: "SENDER_OR_PARAMS",
        status: errorCode,
        messageId,
        errorCode,
      };
    }

    return {
      ok: false,
      error: errorCode ? `API_${errorCode}` : "BAD_RESPONSE",
      status: errorCode,
      messageId,
      errorCode: errorCode || undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "NETWORK_ERROR",
      status: null,
      messageId: null,
    };
  }
}

function normalizeErrorCode(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value).trim();
}
