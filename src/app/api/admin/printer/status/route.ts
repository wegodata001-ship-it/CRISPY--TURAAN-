import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import { isAutoPrintNewOrdersEnabled } from "@/lib/print-jobs/config";
import { getAgentHeartbeat, isAgentOnline } from "@/lib/print-jobs/heartbeat";
import { countJobsByStatus, lastSuccessfulPrintAt, listRecentPrintJobs } from "@/lib/print-jobs/jobs";
import {
  ANDROID_PRINT_AGENT_ID,
  EXTERNAL_PRINTER_HOST,
  EXTERNAL_PRINTER_PORT,
  isBlockedPrinterHost,
  isExternalPrinter,
} from "@/lib/printer/destination";
import { PRINTER_DISPLAY_NAME } from "@/lib/print-jobs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const [heartbeat, counts, lastPrint, jobs] = await Promise.all([
      getAgentHeartbeat(ANDROID_PRINT_AGENT_ID),
      countJobsByStatus(),
      lastSuccessfulPrintAt(),
      listRecentPrintJobs(30),
    ]);

    const online = isAgentOnline(heartbeat);
    const destinationOk = isExternalPrinter(heartbeat?.printerIp, heartbeat?.printerPort);
    const destinationBlocked = isBlockedPrinterHost(heartbeat?.printerIp);

    return NextResponse.json({
      ok: true,
      printer: {
        name: PRINTER_DISPLAY_NAME,
        id: "CRISPY_MAIN",
        ip: EXTERNAL_PRINTER_HOST,
        port: EXTERNAL_PRINTER_PORT,
        connection: "RAW TCP",
      },
      agent: {
        online,
        status: online ? "online" : "offline",
        lastSeenAt: heartbeat?.lastSeenAt ?? null,
        hostname: heartbeat?.hostname ?? null,
        version: heartbeat?.version ?? null,
        printerConnectionStatus: heartbeat?.printerConnectionStatus ?? "unknown",
        ethernetAvailable: heartbeat?.ethernetAvailable ?? null,
        ethernetIp: heartbeat?.ethernetIp ?? null,
        wifiSameSubnet: heartbeat?.wifiSameSubnet ?? null,
        printerMac: heartbeat?.printerMac ?? null,
        tcp9100: heartbeat?.tcp9100 ?? null,
        routeConflict: heartbeat?.routeConflict ?? null,
        networkWarning: heartbeat?.networkWarning ?? null,
        platform: heartbeat?.platform ?? null,
      },
      signals: {
        agentOffline: !online,
        printerConnectionFailed:
          online && (heartbeat?.printerConnectionStatus === "disconnected" || !destinationOk),
        destinationBlocked,
        printJobFailed: counts.failed > 0,
      },
      lastSuccessfulPrintAt: lastPrint,
      counts,
      autoPrintNewOrders: isAutoPrintNewOrdersEnabled(),
      jobs,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "status failed" },
      { status: 500 }
    );
  }
}
