import type { PrintJobType, PrintLocale } from "@/lib/print-jobs/types";
import { DEFAULT_PRINT_LOCALE, PRINT_LOCALES } from "@/lib/print-jobs/types";

export function newOrderPrintJobId(orderId: string): string {
  return `NEW_ORDER_${orderId}`;
}

export function printJobUniqueKey(orderId: string, type: PrintJobType): string {
  return `${orderId}:${type}`;
}

export function parsePrintLocale(value: unknown): PrintLocale {
  if (typeof value === "string" && (PRINT_LOCALES as readonly string[]).includes(value)) {
    return value as PrintLocale;
  }
  return DEFAULT_PRINT_LOCALE;
}
