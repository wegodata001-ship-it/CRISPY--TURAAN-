import { acceptedDeliveryStatus, failedDeliveryStatus } from "@/lib/phone-otp/engine";

const TELNYX_API = "https://api.telnyx.com/v2";

export type TelnyxConfig = {
  apiKey: string;
  messagingProfileId: string;
  senderId: string;
};

export function readTelnyxConfig(env: NodeJS.ProcessEnv = process.env): TelnyxConfig | null {
  const apiKey = env.TELNYX_API_KEY?.trim() || "";
  const messagingProfileId = env.TELNYX_MESSAGING_PROFILE_ID?.trim() || "";
  const senderId = env.TELNYX_SENDER_ID?.trim() || "CRISPY";
  if (!apiKey || !messagingProfileId) return null;
  return { apiKey, messagingProfileId, senderId };
}

/**
 * Real Telnyx send — must only be called when isPhoneOtpRealSmsEnabled() is true.
 * OTP body must be exactly 6 digits. Sender ID stays separate (`from` / Alpha Sender CRISPY).
 */
export type TelnyxSendResult =
  | { ok: true; status: string; messageId: string | null }
  | {
      ok: false;
      error: string;
      status: string | null;
      messageId: string | null;
      httpStatus?: number | null;
      telnyxCode?: string | null;
      telnyxTitle?: string | null;
    };

export async function sendTelnyxSms(
  to: string,
  text: string,
  config = readTelnyxConfig(),
  fetchImpl: typeof fetch = fetch
): Promise<TelnyxSendResult> {
  if (!config) return { ok: false, error: "NOT_CONFIGURED", status: null, messageId: null };
  // Strict: OTP body must already be exactly 6 digits — never send branded text.
  if (!/^\d{6}$/.test(String(text ?? ""))) {
    return { ok: false, error: "INVALID_MESSAGE", status: null, messageId: null };
  }
  const created = await telnyxFetch(
    config,
    "/messages",
    {
      method: "POST",
      body: {
        from: config.senderId,
        to,
        text,
        messaging_profile_id: config.messagingProfileId,
        type: "SMS",
      },
    },
    fetchImpl
  );
  if (!created.ok) {
    const first = Array.isArray(created.body.errors) ? created.body.errors[0] : undefined;
    return {
      ok: false,
      error: created.error || "SEND_FAILED",
      status: created.status ? String(created.status) : null,
      messageId: null,
      httpStatus: created.status || null,
      telnyxCode: typeof first?.code === "string" || typeof first?.code === "number" ? String(first.code) : null,
      telnyxTitle: typeof first?.title === "string" ? first.title : null,
    };
  }
  const data = asRecord(created.body.data);
  const messageId = typeof data?.id === "string" ? data.id : null;
  let status = messageStatus(data);
  if (messageId) {
    const followUp = await telnyxFetch(config, `/messages/${messageId}`, undefined, fetchImpl);
    if (followUp.ok) status = messageStatus(asRecord(followUp.body.data)) || status;
  }
  if (failedDeliveryStatus(status)) {
    return { ok: false, error: "DELIVERY_FAILED", status, messageId };
  }
  if (status && !acceptedDeliveryStatus(status)) {
    return { ok: false, error: "DELIVERY_FAILED", status, messageId };
  }
  return { ok: true, status: status || "queued", messageId };
}

async function telnyxFetch(
  config: TelnyxConfig,
  path: string,
  init?: { method?: string; body?: Record<string, unknown> },
  fetchImpl: typeof fetch = fetch
) {
  try {
    const response = await fetchImpl(`${TELNYX_API}${path}`, {
      method: init?.method || "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as {
      data?: unknown;
      errors?: Array<{ title?: string; detail?: string; code?: string | number }>;
    } | null;
    if (!response.ok) {
      const first = body?.errors?.[0];
      const detail = [first?.code, first?.title, first?.detail].filter(Boolean).join(": ");
      return {
        ok: false as const,
        status: response.status,
        error: detail || `Telnyx HTTP ${response.status}`,
        body: body || {},
      };
    }
    return { ok: true as const, status: response.status, error: null, body: body || {} };
  } catch (error) {
    return {
      ok: false as const,
      status: 0,
      error: error instanceof Error ? error.message : "Telnyx request failed",
      body: { errors: [] },
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function messageStatus(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  if (typeof data.status === "string") return data.status;
  const to = Array.isArray(data.to) ? data.to[0] : null;
  const recipient = asRecord(to);
  return typeof recipient?.status === "string" ? recipient.status : null;
}
