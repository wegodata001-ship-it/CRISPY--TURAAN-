/**
 * MISHKAH standalone kitchen print agent.
 * Café PC only. Talks to https://mishkatcafe.dev print APIs and LAN 192.168.1.87:9100.
 * No Firebase Admin. No website source.
 */
import { hostname as osHostname } from "node:os";
import {
  apiBase,
  getPrintAgentHeartbeatMs,
  getPrintAgentPollMs,
  getPrinterHost,
  getPrinterPort,
  isPrinterAutoCutEnabled,
  isPrinterBeepEnabled,
  loadAgentEnv,
  requiredEnv,
} from "./env";
import { log } from "./logger";
import { concatBuffers, escBeep, escCut, escFeedLines } from "./escpos";
import { PrinterConnectionError, probePrinterConnection, sendRawToPrinter } from "./tcp";
import { buildReceiptPrintPayload } from "./receipt-raster";
import type { PrintJob, ReceiptModel } from "./types";

const VERSION = "1.0.0";

type ClaimResponse = {
  ok?: boolean;
  job?: PrintJob | null;
  receipt?: ReceiptModel;
  error?: string;
};

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
  log.info("Heartbeat sending");
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
    log.error("Heartbeat failed", res.status, text.slice(0, 200));
    throw new Error(`heartbeat HTTP ${res.status}`);
  }
  log.info("Heartbeat PASS");
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
  log.info(`Printer connecting ${host}:${port}`);
  try {
    const result = await sendRawToPrinter(data);
    log.info(`Printer sent ${result.bytesSent} bytes`);
    log.info("Print completed");
  } catch (error) {
    const code = error instanceof PrinterConnectionError ? error.code : undefined;
    if (code === "ETIMEDOUT") log.error("Printer timeout");
    else log.error("Printer connection failed", error instanceof Error ? error.message : error);
    throw error;
  }
}

async function printReceipt(
  job: PrintJob,
  receipt: ReceiptModel
): Promise<{ cutterError?: string; beepError?: string }> {
  const payload = await buildReceiptPrintPayload(receipt, "none");
  await sendBytes(payload);

  let beepError: string | undefined;
  let cutterError: string | undefined;

  if (isPrinterBeepEnabled() && job.type === "NEW_ORDER") {
    try {
      await sendRawToPrinter(escBeep(2, 2));
    } catch (error) {
      beepError = error instanceof Error ? error.message : "beep failed";
      log.error("Beep failed (ignored)", beepError);
    }
  }

  if (isPrinterAutoCutEnabled()) {
    try {
      await sendRawToPrinter(concatBuffers(escFeedLines(2), escCut("full")));
    } catch (error) {
      cutterError = error instanceof Error ? error.message : "cutter failed";
      log.error("Cutter failed (receipt already printed)", cutterError);
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
    log.error("Claim failed", json.error || res.status);
    throw new Error(`claim HTTP ${res.status}`);
  }
  if (!json.job || !json.receipt) return false;

  const job = json.job;
  const orderNumber = json.receipt.orderNumber || job.orderId || "n/a";
  log.info("Job detected", job.id, job.type, "order", orderNumber);
  log.info("Job claimed", job.id);

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
    if (!printed.ok) log.error("Mark PRINTED failed", printed.status);
    else log.info("Job PRINTED", job.id, "order", orderNumber);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "print failed";
    log.error("Print failed, reporting FAILED", job.id, message);
    await agentFetch(`/api/print-agent/jobs/${job.id}/failed`, {
      method: "POST",
      body: JSON.stringify({ error: message }),
    }).catch(() => undefined);
    return true;
  }
}

async function verifyOnce(): Promise<number> {
  const host = getPrinterHost();
  const port = getPrinterPort();
  const backend = apiBase();
  let code = 0;

  log.info("Verify mode");
  log.info("Backend URL", backend);

  try {
    requiredEnv("PRINT_AGENT_TOKEN");
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
    const auth =
      probe.status === 401 || probe.status === 403
        ? "FAIL"
        : probe.ok
          ? "PASS"
          : `FAIL HTTP ${probe.status}`;
    log.info(`Backend connection: ${probe.ok ? "PASS" : "FAIL"}`);
    log.info(`Agent authentication: ${auth}`);
    if (!probe.ok) code = 1;
  } catch (error) {
    log.error("Backend connection: FAIL", error instanceof Error ? error.message : error);
    log.info("Agent authentication: FAIL");
    code = 1;
  }

  try {
    await probePrinterConnection();
    log.info(`Printer TCP: PASS ${host}:${port}`);
  } catch (error) {
    log.error(`Printer TCP: FAIL ${host}:${port}`, error instanceof Error ? error.message : error);
    code = 1;
  }

  return code;
}

async function main() {
  const home = loadAgentEnv();
  const verify = process.argv.includes("--verify");

  log.info("[MISHKAH Print Agent]", VERSION);
  log.info("Home", home);

  if (process.env.PRINT_AGENT_ENABLED !== "true") {
    log.info("PRINT_AGENT_ENABLED is not true. Exiting.");
    process.exit(0);
  }

  if (!process.env.PRINT_AGENT_TOKEN?.trim()) {
    log.error("Agent authentication: FAIL — missing PRINT_AGENT_TOKEN");
    process.exit(1);
  }

  if (verify) {
    process.exit(await verifyOnce());
  }

  const host = getPrinterHost();
  const port = getPrinterPort();
  const backend = apiBase();
  const pollMs = getPrintAgentPollMs();
  const heartbeatMs = getPrintAgentHeartbeatMs();

  log.info("Backend URL", backend);
  log.info(`Printer ${host}:${port}`);
  log.info(`Poll ${pollMs}ms · heartbeat ${heartbeatMs}ms`);
  log.info("Waiting for print jobs...");

  let backendDown = false;
  let printerDown = false;
  let polling = false;

  const tick = async () => {
    if (polling) return;
    polling = true;
    try {
      await claimAndPrint();
      if (backendDown) {
        log.info("Backend reconnected: PASS");
        backendDown = false;
      }
    } catch (error) {
      if (!backendDown) {
        log.error(
          "Backend/network outage — will retry",
          error instanceof Error ? error.message : error
        );
        backendDown = true;
      }
    } finally {
      polling = false;
    }
  };

  const beat = async () => {
    try {
      const status = await probePrinter();
      if (status === "disconnected") {
        if (!printerDown) {
          log.error("Printer/network outage — will retry TCP");
          printerDown = true;
        }
      } else if (printerDown) {
        log.info("Printer reconnected: PASS");
        printerDown = false;
      }
      await sendHeartbeat(status);
      if (backendDown) {
        log.info("Backend reconnected: PASS");
        backendDown = false;
      }
    } catch (error) {
      if (!backendDown) {
        log.error("Heartbeat/network outage — will retry", error instanceof Error ? error.message : error);
        backendDown = true;
      }
      await sendHeartbeat("unknown").catch(() => undefined);
    }
  };

  await beat();
  await tick();
  setInterval(() => void tick(), pollMs);
  setInterval(() => void beat(), heartbeatMs);
}

main().catch((error) => {
  log.error("Fatal", error instanceof Error ? error.message : error);
  process.exit(1);
});
