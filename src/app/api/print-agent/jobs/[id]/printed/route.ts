import { NextRequest, NextResponse } from "next/server";
import { requirePrintAgent } from "@/lib/print-jobs/auth";
import { markPrintJobPrinted } from "@/lib/print-jobs/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requirePrintAgent(request);
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      printerIp?: string;
      printerPort?: number;
      cutterError?: string;
      beepError?: string;
      physicalConfirmed?: boolean;
    };
    const status = await markPrintJobPrinted(id, body);
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "update failed" },
      { status: 500 }
    );
  }
}
