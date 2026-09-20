import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import { retryAllFailedJobs, retryFailedPrintJob } from "@/lib/print-jobs/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as { jobId?: string };
    if (body.jobId?.trim()) {
      const result = await retryFailedPrintJob(body.jobId.trim());
      return NextResponse.json({ ok: true, ...result });
    }
    const count = await retryAllFailedJobs();
    return NextResponse.json({ ok: true, retried: count });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "retry failed" },
      { status: 500 }
    );
  }
}
