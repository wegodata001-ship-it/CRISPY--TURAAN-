import { NextRequest, NextResponse } from "next/server";
import { notifyNewOrder } from "@/lib/email/notifications";
import { maybeEnqueueNewOrderPrint } from "@/lib/print-jobs/enqueue-new-order";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderId?: string };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });
    }

    // Print job is independent of email. Unique key prevents duplicates.
    void maybeEnqueueNewOrderPrint(orderId).catch((error) => {
      console.error("[PrintJob] enqueue failed", {
        orderId,
        error: error instanceof Error ? error.message : "unknown",
      });
    });

    const result = await notifyNewOrder(orderId);
    return jsonNotify(result);
  } catch (error) {
    console.error("[email] Email notification failed", {
      kind: "new_order",
      stage: "api",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Notification failed" },
      { status: 500 }
    );
  }
}

function jsonNotify(
  result:
    | { status: "sent"; messageId?: string }
    | { status: "already_sent" }
    | { status: "in_progress" }
    | { status: "skipped"; reason: string }
    | { status: "failed"; error: string }
) {
  if (result.status === "sent") {
    return NextResponse.json({ ok: true, status: "SENT", messageId: result.messageId });
  }
  if (result.status === "already_sent") {
    return NextResponse.json({ ok: true, status: "ALREADY_SENT" });
  }
  if (result.status === "in_progress") {
    return NextResponse.json({ ok: true, status: "SKIPPED", reason: "in_progress" });
  }
  if (result.status === "skipped") {
    return NextResponse.json({ ok: false, status: "SKIPPED", reason: result.reason }, { status: 404 });
  }
  return NextResponse.json({ ok: false, status: "FAILED", error: result.error }, { status: 502 });
}
