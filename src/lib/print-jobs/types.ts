export const PRINT_JOB_STATUSES = ["PENDING", "PRINTING", "PRINTED", "FAILED"] as const;
export type PrintJobStatus = (typeof PRINT_JOB_STATUSES)[number];

export const PRINT_JOB_TYPES = ["NEW_ORDER", "REPRINT", "TEST"] as const;
export type PrintJobType = (typeof PRINT_JOB_TYPES)[number];

export const PRINT_LOCALES = ["ar", "he", "en"] as const;
export type PrintLocale = (typeof PRINT_LOCALES)[number];

export const DEFAULT_PRINT_LOCALE: PrintLocale = "ar";
export const PRINT_STORE_ID = "crispy";
export const PRINTER_DISPLAY_NAME = "CRISPY MAIN";
export const PRINTER_ID = "CRISPY_MAIN";

export const MAX_PRINT_ATTEMPTS = 3;
/** After attempt 1 fails wait 10s; after attempt 2 fails wait 30s; then FAILED. */
export const PRINT_RETRY_DELAYS_MS = [0, 10_000, 30_000] as const;
export const STALE_PRINTING_MS = 2 * 60 * 1000;
export const AGENT_ONLINE_MS = 90_000;

export interface PrintJob {
  id: string;
  storeId: string;
  orderId: string | null;
  type: PrintJobType;
  status: PrintJobStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string | null;
  printedAt: string | null;
  claimedAt: string | null;
  claimedBy: string | null;
  nextRetryAt: string | null;
  uniqueKey: string | null;
  locale: PrintLocale;
  printerIp?: string | null;
  printerPort?: number | null;
  requestedBy?: string | null;
  requestedAt?: string | null;
  cutterError?: string | null;
}

export interface PrintAgentHeartbeat {
  agentId: string;
  hostname: string;
  version: string;
  lastSeenAt: string | null;
  printerConnectionStatus: "connected" | "disconnected" | "unknown";
  printerIp?: string | null;
  printerPort?: number | null;
  ethernetAvailable?: boolean | null;
  ethernetIp?: string | null;
  wifiSameSubnet?: boolean | null;
  printerMac?: string | null;
  tcp9100?: "PASS" | "FAIL" | "UNKNOWN" | null;
  routeConflict?: boolean | null;
  networkWarning?: string | null;
  platform?: "ANDROID" | "WINDOWS" | null;
  appVersionName?: string | null;
  appVersionCode?: number | null;
}

export interface ReceiptModifierLine {
  label: string;
}

export interface ReceiptItemLine {
  quantity: number;
  name: string;
  lineTotal: number;
  unitPrice?: number;
  modifiers: ReceiptModifierLine[];
  notes?: string;
}

export interface ReceiptModel {
  locale: PrintLocale;
  brand: string;
  brandSecondary?: string;
  headline: string;
  orderNumber: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  items: ReceiptItemLine[];
  notes?: string;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  total: number;
  paymentLabel: string;
  pickupLabel: string;
  fulfillmentLabel?: string;
  orderType?: "pickup" | "delivery";
  address?: string;
  createdTime?: string;
  isTest?: boolean;
  isReprint?: boolean;
}
