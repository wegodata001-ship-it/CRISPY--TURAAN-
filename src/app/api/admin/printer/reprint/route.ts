import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import { parsePrintLocale } from "@/lib/print-jobs/ids";
import { enqueueReprintJob } from "@/lib/print-jobs/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json()) as { orderId?: string; locale?: string };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });
    }
    const result = await enqueueReprintJob(
      orderId,
      body.locale ? parsePrintLocale(body.locale) : undefined,
      auth.email || auth.uid
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "reprint failed" },
      { status: 500 }
    );
  }
}
