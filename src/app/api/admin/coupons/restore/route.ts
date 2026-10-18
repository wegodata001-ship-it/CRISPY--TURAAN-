import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import { restoreCouponForCancelledOrder } from "@/lib/coupons/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  const body = (await request.json().catch(() => null)) as { orderId?: string } | null;
  if (!body?.orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });
  const result = await restoreCouponForCancelledOrder(body.orderId);
  return NextResponse.json(result);
}
