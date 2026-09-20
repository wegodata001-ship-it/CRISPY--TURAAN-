import { NextRequest, NextResponse } from "next/server";
import { maybeEnqueueNewOrderPrint } from "@/lib/print-jobs/enqueue-new-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderId?: string };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });
    }
    const result = await maybeEnqueueNewOrderPrint(orderId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "enqueue failed" },
      { status: 500 }
    );
  }
}
