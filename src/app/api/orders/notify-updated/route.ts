import { NextRequest, NextResponse } from "next/server";
import { notifyOrderUpdated } from "@/lib/email/notifications";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      orderId?: string;
      fingerprint?: string;
      changes?: Array<{ label: string; before: string; after: string }>;
    };
    const orderId = body.orderId?.trim();
    const fingerprint = body.fingerprint?.trim();
    const changes = body.changes ?? [];
    if (!orderId || !fingerprint || !changes.length) {
      return NextResponse.json(
        { ok: false, error: "orderId, fingerprint and changes required" },
        { status: 400 }
      );
    }

    const result = await notifyOrderUpdated({ orderId, fingerprint, changes });
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
      return NextResponse.json({ ok: true, status: "SKIPPED", reason: result.reason });
    }
    return NextResponse.json({ ok: false, status: "FAILED", error: result.error }, { status: 502 });
  } catch (error) {
    console.error("[email] Email notification failed", {
      kind: "order_updated",
      stage: "api",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Notification failed" },
      { status: 500 }
    );
  }
}
