import { PRINT_STORE_ID } from "@/lib/print-jobs/types";

/** Cloud gate: never auto-queue NEW_ORDER jobs until physical test print is confirmed. */
export function isAutoPrintNewOrdersEnabled(): boolean {
  return process.env.PRINT_AUTO_NEW_ORDERS === "true";
}

export function getPrintStoreId(): string {
  return process.env.PRINT_STORE_ID?.trim() || PRINT_STORE_ID;
}

export function isPrinterAutoCutEnabled(): boolean {
  return process.env.PRINTER_AUTO_CUT !== "false";
}

export function isPrinterBeepEnabled(): boolean {
  return process.env.PRINTER_BEEP_ON_NEW_ORDER !== "false";
}

export function getPrintAgentPollMs(): number {
  const raw = Number(process.env.PRINT_POLL_MS || 3000);
  return Number.isFinite(raw) && raw >= 2000 ? raw : 3000;
}

export function getPrintAgentHeartbeatMs(): number {
  const raw = Number(process.env.PRINT_HEARTBEAT_MS || 30_000);
  return Number.isFinite(raw) && raw >= 10_000 ? raw : 30_000;
}
