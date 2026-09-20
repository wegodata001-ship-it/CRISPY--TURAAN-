/**
 * MISHKAH local print agent.
 * Runs on the restaurant Windows PC. Polls cloud print jobs and sends ESC/POS
 * to the LAN thermal printer. Never run this in Vercel.
 *
 * Start: npm run print-agent
 */
import { config as loadEnv } from "dotenv";
import { hostname as osHostname } from "node:os";
import { resolve } from "node:path";
import { getPrinterHost, getPrinterPort, getPrinterTimeoutMs } from "@/lib/printer/config";
import { concatBuffers, escBeep, escCut, escFeedLines } from "@/lib/printer/escpos";
import { sendRawToPrinter, probePrinterConnection, PrinterConnectionError } from "@/lib/printer/tcp";
import { buildReceiptPrintPayload } from "@/lib/printer/receipt-raster";
import {
  getPrintAgentHeartbeatMs,
  getPrintAgentPollMs,
  isPrinterAutoCutEnabled,
  isPrinterBeepEnabled,
} from "@/lib/print-jobs/config";
import type { PrintJob, ReceiptModel } from "@/lib/print-jobs/types";

loadEnv({ path: resolve(process.cwd(), "printer-agent/.env") });
loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const VERSION = "1.0.0";

type ClaimResponse = {
  ok?: boolean;
  job?: PrintJob | null;
  receipt?: ReceiptModel;
  error?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function apiBase(): string {
  return (
    process.env.PRINT_AGENT_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function agentId(): string {
  return process.env.PRINT_AGENT_ID?.trim() || `mishkah-${osHostname()}`;
}

function agentHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${requiredEnv("PRINT_AGENT_TOKEN")}`,
  };
}

async function agentFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { ...agentHeaders(), ...init?.headers },
  });
}

async function sendHeartbeat(printerStatus: "connected" | "disconnected" | "unknown") {
  console.info("[PrintAgent] heartbeat");
  const res = await agentFetch("/api/print-agent/heartbeat", {
    method: "POST",
    body: JSON.stringify({
      agentId: agentId(),
      hostname: osHostname(),
      version: VERSION,
      printerConnectionStatus: printerStatus,
      printerIp: getPrinterHost(),
      printerPort: getPrinterPort(),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[PrintAgent] heartbeat failed", res.status, text.slice(0, 200));
  }
}

async function probePrinter(): Promise<"connected" | "disconnected"> {
  try {
    await probePrinterConnection();
    return "connected";
  } catch {
    return "disconnected";
  }
}

async function sendBytes(data: Buffer): Promise<void> {
  const host = getPrinterHost();
  const port = getPrinterPort();
  console.info(`[Printer] connecting ${host}:${port}`);
  try {
    const result = await sendRawToPrinter(data);
    console.info("[Printer] connected");
    console.info(`[Printer] sending ${result.bytesSent} bytes`);
    console.info("[Printer] print complete");
  } catch (error) {
    const code = error instanceof PrinterConnectionError ? error.code : undefined;
    if (code === "ETIMEDOUT") {
      console.error("[Printer] timeout");
    } else if (code && code !== "EWRITE") {
      console.error("[Printer] connection failed");
    } else {
      console.error("[Printer] socket error", error instanceof Error ? error.message : error);
    }
    throw error;
  }
}

async function printReceipt(job: PrintJob, receipt: ReceiptModel): Promise<{
  cutterError?: string;
  beepError?: string;
}> {
  const payload = await buildReceiptPrintPayload(receipt, "none");
  await sendBytes(payload);

  let beepError: string | undefined;
  let cutterError: string | undefined;

  if (isPrinterBeepEnabled() && job.type === "NEW_ORDER") {
    try {
      await sendRawToPrinter(escBeep(2, 2));
    } catch (error) {
      beepError = error instanceof Error ? error.message : "beep failed";
      console.error("[Printer] beep failed (ignored)", beepError);
    }
  }

  if (isPrinterAutoCutEnabled()) {
    try {
      await sendRawToPrinter(concatBuffers(escFeedLines(2), escCut("full")));
    } catch (error) {
      cutterError = error instanceof Error ? error.message : "cutter failed";
      console.error("[Printer] cutter failed (receipt already printed)", cutterError);
    }
  }

  return { cutterError, beepError };
}

async function claimAndPrint(): Promise<boolean> {
  const res = await agentFetch("/api/print-agent/jobs/claim", {
    method: "POST",
    body: JSON.stringify({ agentId: agentId() }),
  });
  const json = (await res.json().catch(() => ({}))) as ClaimResponse;
  if (!res.ok) {
    console.error("[PrintAgent] claim failed", json.error || res.status);
    return false;
  }
  if (!json.job || !json.receipt) return false;

  const job = json.job;
  console.info("[PrintAgent] job claimed", job.id);

  try {
    const extras = await printReceipt(job, json.receipt);
    const printed = await agentFetch(`/api/print-agent/jobs/${job.id}/printed`, {
      method: "POST",
      body: JSON.stringify({
        printerIp: getPrinterHost(),
        printerPort: getPrinterPort(),
        ...extras,
      }),
    });
    if (!printed.ok) {
      console.error("[PrintAgent] mark PRINTED failed", printed.status);
    } else {
      console.info("[PrintAgent] job PRINTED");
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "print failed";
    console.error("[PrintAgent] retry scheduled", message);
    await agentFetch(`/api/print-agent/jobs/${job.id}/failed`, {
      method: "POST",
      body: JSON.stringify({ error: message }),
    }).catch(() => undefined);
    return true;
  }
}

async function main() {
  if (process.env.PRINT_AGENT_ENABLED !== "true") {
    console.info("[PrintAgent] disabled. Set PRINT_AGENT_ENABLED=true to start.");
    process.exit(0);
  }

  requiredEnv("PRINT_AGENT_TOKEN");

  const pollMs = getPrintAgentPollMs();
  const heartbeatMs = getPrintAgentHeartbeatMs();
  const host = getPrinterHost();
  const port = getPrinterPort();

  console.info("[PrintAgent] starting", {
    api: apiBase(),
    agentId: agentId(),
    printer: `${host}:${port}`,
    timeoutMs: getPrinterTimeoutMs(),
    pollMs,
    heartbeatMs,
    autoCut: isPrinterAutoCutEnabled(),
    beep: isPrinterBeepEnabled(),
  });

  let polling = false;
  const tick = async () => {
    if (polling) return;
    polling = true;
    try {
      await claimAndPrint();
    } catch (error) {
      console.error("[PrintAgent] poll error", error instanceof Error ? error.message : error);
    } finally {
      polling = false;
    }
  };

  const beat = async () => {
    try {
      const status = await probePrinter();
      await sendHeartbeat(status);
    } catch (error) {
      console.error("[PrintAgent] heartbeat error", error instanceof Error ? error.message : error);
      await sendHeartbeat("unknown").catch(() => undefined);
    }
  };

  await beat();
  await tick();
  setInterval(() => void tick(), pollMs);
  setInterval(() => void beat(), heartbeatMs);
}

main().catch((error) => {
  console.error("[PrintAgent] fatal", error instanceof Error ? error.message : error);
  process.exit(1);
});
