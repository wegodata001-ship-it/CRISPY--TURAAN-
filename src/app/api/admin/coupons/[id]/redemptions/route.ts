import { NextRequest, NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/auth/verify-admin";
import { listRedemptions } from "@/lib/coupons/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOnly(request);
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  const redemptions = await listRedemptions(id);
  return NextResponse.json({ redemptions });
}
