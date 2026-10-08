export type PrintJobType = "NEW_ORDER" | "REPRINT" | "TEST";
export type PrintJobStatus = "PENDING" | "PRINTING" | "PRINTED" | "FAILED";
export type PrintLocale = "ar" | "he" | "en";

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
