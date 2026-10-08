import { NextRequest, NextResponse } from "next/server";
import { requirePrintAgent } from "@/lib/print-jobs/auth";
import { upsertAgentHeartbeat } from "@/lib/print-jobs/heartbeat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = requirePrintAgent(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json()) as {
      agentId?: string;
      hostname?: string;
      version?: string;
      printerConnectionStatus?: "connected" | "disconnected" | "unknown";
      printerIp?: string;
      printerPort?: number;
      ethernetAvailable?: boolean;
      ethernetIp?: string | null;
      wifiSameSubnet?: boolean;
      printerMac?: string | null;
      tcp9100?: "PASS" | "FAIL" | "UNKNOWN";
      routeConflict?: boolean;
      networkWarning?: string | null;
      platform?: "ANDROID" | "WINDOWS";
    };
    const agentId = body.agentId?.trim();
    if (!agentId) {
      return NextResponse.json({ ok: false, error: "agentId required" }, { status: 400 });
    }

    await upsertAgentHeartbeat({
      agentId,
      hostname: body.hostname?.trim() || "unknown",
      version: body.version?.trim() || "0",
      printerConnectionStatus: body.printerConnectionStatus ?? "unknown",
      printerIp: body.printerIp,
      printerPort: body.printerPort,
      ethernetAvailable: body.ethernetAvailable,
      ethernetIp: body.ethernetIp,
      wifiSameSubnet: body.wifiSameSubnet,
      printerMac: body.printerMac,
      tcp9100: body.tcp9100,
      routeConflict: body.routeConflict,
      networkWarning: body.networkWarning,
      platform: body.platform === "ANDROID" || body.platform === "WINDOWS" ? body.platform : null,
    });

    console.info("[PrintAgent] heartbeat", agentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "heartbeat failed" },
      { status: 500 }
    );
  }
}
