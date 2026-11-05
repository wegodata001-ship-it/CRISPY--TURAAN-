import {
  orderKitchenPrintBlockReason,
  type PrintPaymentGateOptions,
} from "@/lib/print-jobs/payment-gate";

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

/** The tablet may claim only after it has reached the CRISPY printer. */
export function kitchenClaimBlockReason(heartbeat: {
  printerIp?: string | null;
  printerPort?: number | null;
  printerConnectionStatus?: string | null;
} | null): "printer_not_allowed" | "printer_offline" | null {
  if (!isExternalPrinter(heartbeat?.printerIp, heartbeat?.printerPort)) return "printer_not_allowed";
  if (heartbeat?.printerConnectionStatus !== "connected") return "printer_offline";
  return null;
}

/**
 * Skip reason before queueing / claiming a kitchen ticket.
 * Hyp OFF: cash and card still print while payment is pending (legacy).
 * Hyp ON: online card tickets wait until paymentStatus=paid.
 */
export function automaticPrintSkipReason(
  order: {
    status?: string | null;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    requiresOnlinePayment?: boolean | null;
    awaitingHypPayment?: boolean | null;
  },
  options?: PrintPaymentGateOptions
): string | null {
  return orderKitchenPrintBlockReason(order, options);
}
