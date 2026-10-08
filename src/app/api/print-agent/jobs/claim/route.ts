import { NextRequest, NextResponse } from "next/server";
import { requirePrintAgent } from "@/lib/print-jobs/auth";
import { getAgentHeartbeat } from "@/lib/print-jobs/heartbeat";
import { claimNextPrintJob } from "@/lib/print-jobs/jobs";
import { loadReceiptForJob } from "@/lib/print-jobs/load-receipt";
import { isAndroidPrintAgent, isExternalPrinter } from "@/lib/printer/destination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = requirePrintAgent(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as { agentId?: string };
    const agentId = body.agentId?.trim();
    if (!agentId) {
      return NextResponse.json({ ok: false, error: "agentId required" }, { status: 400 });
    }
    if (!isAndroidPrintAgent(agentId)) {
      return NextResponse.json({ ok: true, job: null, reason: "agent_not_allowed" });
    }
    const heartbeat = await getAgentHeartbeat(agentId);
    if (!isExternalPrinter(heartbeat?.printerIp, heartbeat?.printerPort)) {
      return NextResponse.json({ ok: true, job: null, reason: "printer_not_allowed" });
    }

    const result = await claimNextPrintJob(agentId);
    if (result.status === "empty") {
      return NextResponse.json({ ok: true, job: null });
    }
    if (result.status !== "claimed") {
      return NextResponse.json({ ok: true, job: null, reason: result.reason });
    }

    const receipt = await loadReceiptForJob(result.job);
    console.info("[PrintAgent] job claimed", result.job.id);
    return NextResponse.json({ ok: true, job: result.job, receipt });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "claim failed" },
      { status: 500 }
    );
  }
}
