export const STORAGE_ERROR_KEYS = {
  canceled: "storage/canceled",
  notReady: "admin.upload.storageNotReady",
  unauthenticated: "admin.upload.unauthenticated",
  unauthorized: "admin.upload.unauthorized",
  invalidType: "admin.upload.invalidType",
  tooLarge: "admin.upload.tooLarge",
  quota: "admin.upload.quota",
  stalled: "admin.upload.stalled",
  network: "admin.upload.network",
  failed: "admin.upload.failed",
} as const;

export type StorageErrorKey = (typeof STORAGE_ERROR_KEYS)[keyof typeof STORAGE_ERROR_KEYS];

function errorCode(error: unknown): string {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code?: string }).code);
  }
  return "";
}

function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  const parts: string[] = [];
  if (error instanceof Error) parts.push(error.message);
  if (typeof error === "object" && error) {
    const payload = error as {
      customData?: { serverResponse?: string };
      serverResponse?: string;
    };
    if (payload.customData?.serverResponse) parts.push(payload.customData.serverResponse);
    if (payload.serverResponse) parts.push(payload.serverResponse);
  }
  return parts.join(" ");
}

export function storageErrorTranslationKey(error: unknown): string {
  const code = errorCode(error).toLowerCase();
  const message = errorText(error);

  if (code === "storage/canceled" || message === "storage/canceled") {
    return STORAGE_ERROR_KEYS.canceled;
  }
  if (
    code === "storage/unauthenticated" ||
    message.includes("unauthenticated")
  ) {
    return STORAGE_ERROR_KEYS.unauthenticated;
  }
  if (
    code === "storage/unauthorized" ||
    message.includes("unauthorized") ||
    message.includes("permission-denied") ||
    message.includes("permission denied")
  ) {
    return STORAGE_ERROR_KEYS.unauthorized;
  }
  if (
    code === "storage/invalid-format" ||
    message.includes("invalidType") ||
    message.includes("contentType") ||
    message.includes("not a supported")
  ) {
    return STORAGE_ERROR_KEYS.invalidType;
  }
  if (
    message.includes("tooLarge") ||
    message.includes("too large") ||
    message.includes("file size")
  ) {
    return STORAGE_ERROR_KEYS.tooLarge;
  }
  if (code === "storage/quota-exceeded") {
    return STORAGE_ERROR_KEYS.quota;
  }
  if (
    code === "storage/retry-limit-exceeded" ||
    message.includes("no progress") ||
    message.includes("stalled")
  ) {
    return STORAGE_ERROR_KEYS.stalled;
  }
  if (
    message.includes("not enabled") ||
    message.includes("Get Started") ||
    message.includes("bucket-not-found") ||
    message.includes("404")
  ) {
    return STORAGE_ERROR_KEYS.notReady;
  }
  if (
    code === "storage/unknown" &&
    (message.includes("network") || message.includes("fetch") || message.includes("CORS"))
  ) {
    return STORAGE_ERROR_KEYS.network;
  }
  if (message.startsWith("admin.upload.")) return message;
  return STORAGE_ERROR_KEYS.failed;
}

export function uploadErrorMessage(
  error: string | undefined,
  t: (key: string) => string
): string {
  if (!error || error === STORAGE_ERROR_KEYS.canceled) return "";
  const key = storageErrorTranslationKey(error);
  if (key === STORAGE_ERROR_KEYS.canceled) return "";
  return t(key);
}

export function isEmbeddedImagePayload(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.includes("base64,")
  );
}
