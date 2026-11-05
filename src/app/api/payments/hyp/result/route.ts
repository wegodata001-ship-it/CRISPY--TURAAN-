import { NextRequest, NextResponse } from "next/server";
import { loadHypResultSession } from "@/lib/payments/hyp/server-confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trusted payment-result session lookup.
 * Query `status=paid` on the page is ignored — only opaque tokens issued by the return route work.
 * Does not expose full order documents.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!token.trim()) {
    return NextResponse.json({ ok: true, status: "pending", code: "MISSING_TOKEN" });
  }

  try {
    const session = await loadHypResultSession(token);
    if (!session) {
      return NextResponse.json({ ok: true, status: "pending", code: "UNKNOWN_TOKEN" });
    }
    return NextResponse.json({
      ok: true,
      status: session.status,
      orderLabel: session.orderLabel,
      code: session.code,
    });
  } catch {
    return NextResponse.json({ ok: true, status: "pending", code: "LOOKUP_FAILED" }, { status: 200 });
  }
}
