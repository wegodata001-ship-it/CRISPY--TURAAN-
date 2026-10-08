/** The only printer CRISPY may use. The internal printer is never a fallback. */
export const EXTERNAL_PRINTER_HOST = "192.168.1.80";
export const EXTERNAL_PRINTER_PORT = 9100;
export const BLOCKED_PRINTER_HOST = "192.168.1.87";
export const ANDROID_PRINT_AGENT_ID = "crispy-android-tablet";

export function isBlockedPrinterHost(host: string | null | undefined): boolean {
  return (host || "").trim() === BLOCKED_PRINTER_HOST;
}

export function isExternalPrinter(
  host: string | null | undefined,
  port?: number | null
): boolean {
  const resolvedPort = port == null ? EXTERNAL_PRINTER_PORT : port;
  return (host || "").trim() === EXTERNAL_PRINTER_HOST && resolvedPort === EXTERNAL_PRINTER_PORT;
}

export function isAndroidPrintAgent(agentId: string | null | undefined): boolean {
  return (agentId || "").trim() === ANDROID_PRINT_AGENT_ID;
}

/** Cash and pay-at-counter orders print while payment is still pending. */
export function automaticPrintSkipReason(order: {
  status?: string | null;
  paymentStatus?: string | null;
}): string | null {
  if (order.status === "cancelled") return "order_cancelled";
  if (order.paymentStatus === "failed" || order.paymentStatus === "refunded") {
    return "payment_not_collectable";
  }
  return null;
}
