import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import { dismissPrintJob } from "@/lib/print-jobs/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as { jobId?: string };
    const jobId = body.jobId?.trim();
    if (!jobId) {
      return NextResponse.json({ ok: false, error: "jobId required" }, { status: 400 });
    }
    const result = await dismissPrintJob(jobId);
    return NextResponse.json({
      ok: result.status !== "skipped",
      ...result,
      message: "העבודה סומנה כלא רלוונטית. ההזמנה נשמרה.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "dismiss failed" },
      { status: 500 }
    );
  }
}
