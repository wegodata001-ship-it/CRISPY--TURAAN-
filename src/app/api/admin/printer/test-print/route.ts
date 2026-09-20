import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import { parsePrintLocale } from "@/lib/print-jobs/ids";
import { enqueueTestPrintJob } from "@/lib/print-jobs/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as { locale?: string };
    const locale = parsePrintLocale(body.locale);
    const result = await enqueueTestPrintJob(locale);
    return NextResponse.json({
      ok: true,
      ...result,
      message: "Test print job queued for the local print agent",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "test print failed" },
      { status: 500 }
    );
  }
}
