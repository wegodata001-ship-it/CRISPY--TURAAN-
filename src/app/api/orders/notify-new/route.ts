import { NextRequest, NextResponse } from "next/server";
import { notifyNewOrderEmail } from "@/lib/email/notify-new-order";

export const runtime = "nodejs";

/**
 * POST /api/orders/notify-new
 * Body: { orderId: string }
 *
 * Sends the new-order email once. Never fails the customer checkout —
 * callers should fire-and-forget.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderId?: string };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });
    }

    const result = await notifyNewOrderEmail(orderId);

    if (result.status === "sent") {
      return NextResponse.json({ ok: true, status: result.status, messageId: result.messageId });
    }
    if (result.status === "already_sent") {
      return NextResponse.json({ ok: true, status: result.status });
    }
    if (result.status === "skipped") {
      return NextResponse.json({ ok: false, status: result.status, reason: result.reason }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, status: result.status, error: result.error },
      { status: 502 }
    );
  } catch (error) {
    console.error("[email] Email notification failed", {
      kind: "new_order",
      stage: "api",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Notification failed",
      },
      { status: 500 }
    );
  }
}
