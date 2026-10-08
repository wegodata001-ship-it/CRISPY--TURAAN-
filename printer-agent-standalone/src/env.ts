import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function agentHome(): string {
  if (process.env.MISHKAH_PRINTER_HOME?.trim()) {
    return process.env.MISHKAH_PRINTER_HOME.trim();
  }
  return process.cwd();
}

export function loadDotEnv(filePath: string): void {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadAgentEnv(): string {
  const home = agentHome();
  loadDotEnv(resolve(home, ".env"));
  const bundled = resolve(dirname(process.argv[1] || home), "..", ".env");
  if (bundled !== resolve(home, ".env")) loadDotEnv(bundled);
  return home;
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function apiBase(): string {
  const value = process.env.PRINT_AGENT_API_URL?.trim();
  if (!value) throw new Error("PRINT_AGENT_API_URL is not configured");
  return value.replace(/\/$/, "");
}

export function getPrinterHost(): string {
  return process.env.PRINTER_IP?.trim() || process.env.PRINTER_HOST?.trim() || "";
}

export function getPrinterPort(): number {
  const raw = Number(process.env.PRINTER_PORT || 9100);
  return Number.isFinite(raw) && raw > 0 ? raw : 9100;
}

export function getPrinterTimeoutMs(): number {
  const raw = Number(process.env.PRINTER_TIMEOUT_MS || 8000);
  return Number.isFinite(raw) && raw >= 1000 ? raw : 8000;
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
