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
    console.info("[Printer] sending receipt");
    console.info(`[Printer] sending ${result.bytesSent} bytes`);
    console.info("[Printer] print completed");
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
  console.info("[PrintJob] detected", job.id, job.type);
  console.info("[Order]", json.receipt.orderNumber || job.orderId || "n/a");
  console.info("[PrintAgent] claimed", job.id);

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
      console.info("[PrintJob] PRINTED");
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
  console.info("");
  console.info("[MISHKAH Print Agent]");
  console.info("");

  if (process.env.PRINT_AGENT_ENABLED !== "true") {
    console.info("PRINT_AGENT_ENABLED: DISABLED");
    console.info("Set PRINT_AGENT_ENABLED=true in printer-agent/.env to start.");
    process.exit(0);
  }

  const token = process.env.PRINT_AGENT_TOKEN?.trim();
  if (!token) {
    console.info("Agent authentication: FAIL");
    console.info("Missing PRINT_AGENT_TOKEN");
    process.exit(1);
  }

  const host = getPrinterHost();
  const port = getPrinterPort();
  const backend = apiBase();
  const pollMs = getPrintAgentPollMs();
  const heartbeatMs = getPrintAgentHeartbeatMs();

  let backendOk = false;
  try {
    const probe = await fetch(`${backend}/api/print-agent/heartbeat`, {
      method: "POST",
      headers: agentHeaders(),
      body: JSON.stringify({
        agentId: agentId(),
        hostname: osHostname(),
        version: VERSION,
        printerConnectionStatus: "unknown",
        printerIp: host,
        printerPort: port,
      }),
    });
    backendOk = probe.ok;
    console.info(`Backend connection: ${probe.ok ? "PASS" : "FAIL"}`);
    console.info(`Backend URL: ${backend}`);
    console.info(`Agent authentication: ${probe.status === 401 || probe.status === 403 ? "FAIL" : probe.ok ? "PASS" : `FAIL HTTP ${probe.status}`}`);
    if (!probe.ok) {
      const text = await probe.text().catch(() => "");
      console.error("[PrintAgent] backend error", probe.status, text.slice(0, 200));
    }
  } catch (error) {
    console.info("Backend connection: FAIL");
    console.info("Agent authentication: FAIL");
    console.error("[PrintAgent]", error instanceof Error ? error.message : error);
  }

  let printerTcp: "PASS" | "FAIL" = "FAIL";
  try {
    await probePrinterConnection();
    printerTcp = "PASS";
  } catch (error) {
    console.error("[Printer] TCP FAIL", error instanceof Error ? error.message : error);
  }

  console.info("");
  console.info(`Printer: ${host}:${port}`);
  console.info(`Printer TCP: ${printerTcp}`);
  console.info("Auto new order print: (cloud flag PRINT_AUTO_NEW_ORDERS — not read by agent)");
  console.info(`Heartbeat: ${backendOk ? "PASS" : "FAIL"}`);
  console.info(`Poll every ${pollMs}ms · heartbeat every ${heartbeatMs}ms`);
  console.info("");
  console.info("Waiting for print jobs...");
  console.info("");

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
