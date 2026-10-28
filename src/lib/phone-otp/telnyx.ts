import { acceptedDeliveryStatus, failedDeliveryStatus } from "@/lib/phone-otp/engine";

const TELNYX_API = "https://api.telnyx.com/v2";

export type TelnyxConfig = {
  apiKey: string;
  messagingProfileId: string;
  senderId: string;
};

export type TelnyxInspection = {
  configured: boolean;
  profileFound: boolean;
  profileName: string | null;
  profileEnabled: boolean | null;
  israelAllowed: boolean | null;
  whitelistedDestinations: string[];
  alphaSender: string | null;
  senderReady: boolean;
  balance: string | null;
  errors: string[];
};

export function readTelnyxConfig(): TelnyxConfig | null {
  const apiKey = process.env.TELNYX_API_KEY?.trim() || "";
  const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID?.trim() || "";
  const senderId = process.env.TELNYX_SENDER_ID?.trim() || "CRISPY";
  if (!apiKey || !messagingProfileId) return null;
  return { apiKey, messagingProfileId, senderId };
}

export async function inspectTelnyx(config = readTelnyxConfig()): Promise<TelnyxInspection> {
  if (!config) {
    return {
      configured: false,
      profileFound: false,
      profileName: null,
      profileEnabled: null,
      israelAllowed: null,
      whitelistedDestinations: [],
      alphaSender: null,
      senderReady: false,
      balance: null,
      errors: ["TELNYX_API_KEY or TELNYX_MESSAGING_PROFILE_ID is missing"],
    };
  }
  const errors: string[] = [];
  const profileResponse = await telnyxFetch(config, `/messaging_profiles/${config.messagingProfileId}`);
  const profile = profileResponse.ok ? asRecord(profileResponse.body.data) : null;
  if (!profileResponse.ok) errors.push(profileResponse.error || "messaging profile request failed");
  const destinations = Array.isArray(profile?.whitelisted_destinations)
    ? profile.whitelisted_destinations.filter((item): item is string => typeof item === "string")
    : [];
  const israelAllowed = destinations.length === 0 ? null : destinations.includes("IL") || destinations.includes("*");
  if (israelAllowed === false) errors.push("Israel (IL) is not in the messaging profile whitelisted destinations");
  const alphaSender = typeof profile?.alpha_sender === "string" ? profile.alpha_sender : null;
  if (alphaSender && alphaSender.toUpperCase() !== config.senderId.toUpperCase()) {
    errors.push(`Profile alpha sender is ${alphaSender}, requested sender is ${config.senderId}`);
  }
  if (!alphaSender) errors.push("Messaging profile has no alpha_sender configured");
  const balanceResponse = await telnyxFetch(config, "/balance");
  const balanceRecord = balanceResponse.ok ? asRecord(balanceResponse.body.data) : null;
  if (!balanceResponse.ok) errors.push(balanceResponse.error || "balance request failed");
  const balance =
    balanceRecord && (typeof balanceRecord.balance === "string" || typeof balanceRecord.balance === "number")
      ? `${balanceRecord.balance} ${typeof balanceRecord.currency === "string" ? balanceRecord.currency : ""}`.trim()
      : null;
  return {
    configured: true,
    profileFound: profileResponse.ok,
    profileName: typeof profile?.name === "string" ? profile.name : null,
    profileEnabled: typeof profile?.enabled === "boolean" ? profile.enabled : null,
    israelAllowed,
    whitelistedDestinations: destinations,
    alphaSender,
    senderReady: Boolean(alphaSender && alphaSender.toUpperCase() === config.senderId.toUpperCase() && israelAllowed !== false),
    balance,
    errors,
  };
}

export async function sendTelnyxSms(to: string, text: string, config = readTelnyxConfig()) {
  if (!config) return { ok: false as const, error: "NOT_CONFIGURED", status: null, messageId: null };
  const created = await telnyxFetch(config, "/messages", {
    method: "POST",
    body: {
      from: config.senderId,
      to,
      text,
      messaging_profile_id: config.messagingProfileId,
      type: "SMS",
    },
  });
  if (!created.ok) {
    return { ok: false as const, error: created.error || "SEND_FAILED", status: null, messageId: null };
  }
  const data = asRecord(created.body.data);
  const messageId = typeof data?.id === "string" ? data.id : null;
  let status = messageStatus(data);
  if (messageId) {
    const followUp = await telnyxFetch(config, `/messages/${messageId}`);
    if (followUp.ok) status = messageStatus(asRecord(followUp.body.data)) || status;
  }
  if (failedDeliveryStatus(status)) {
    return { ok: false as const, error: "DELIVERY_FAILED", status, messageId };
  }
  if (status && !acceptedDeliveryStatus(status)) {
    return { ok: false as const, error: "DELIVERY_FAILED", status, messageId };
  }
  return { ok: true as const, status: status || "queued", messageId };
}

async function telnyxFetch(
  config: TelnyxConfig,
  path: string,
  init?: { method?: string; body?: Record<string, unknown> }
) {
  try {
    const response = await fetch(`${TELNYX_API}${path}`, {
      method: init?.method || "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as { data?: unknown; errors?: Array<{ title?: string; detail?: string; code?: string }> } | null;
    if (!response.ok) {
      const first = body?.errors?.[0];
      const detail = [first?.code, first?.title, first?.detail].filter(Boolean).join(": ");
      return { ok: false as const, status: response.status, error: detail || `Telnyx HTTP ${response.status}`, body: body || {} };
    }
    return { ok: true as const, status: response.status, error: null, body: body || {} };
  } catch (error) {
    return {
      ok: false as const,
      status: 0,
      error: error instanceof Error ? error.message : "Telnyx request failed",
      body: {},
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
