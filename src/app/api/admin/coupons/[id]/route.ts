import { NextRequest, NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/auth/verify-admin";
import { updateCoupon } from "@/lib/coupons/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOnly(request);
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  await updateCoupon(id, {
    campaignName: typeof body.campaignName === "string" ? body.campaignName : undefined,
    discountType: body.discountType === "fixed" || body.discountType === "percent" ? body.discountType : undefined,
    discountValue: body.discountValue == null ? undefined : Number(body.discountValue),
    maxRedemptions:
      body.maxRedemptions === undefined
        ? undefined
        : body.maxRedemptions == null || body.maxRedemptions === ""
          ? null
          : Number(body.maxRedemptions),
    onePerCustomer: typeof body.onePerCustomer === "boolean" ? body.onePerCustomer : undefined,
    startsAt: body.startsAt === undefined ? undefined : body.startsAt ? String(body.startsAt) : null,
    expiresAt: body.expiresAt === undefined ? undefined : body.expiresAt ? String(body.expiresAt) : null,
    minOrderAmount:
      body.minOrderAmount === undefined
        ? undefined
        : body.minOrderAmount == null || body.minOrderAmount === ""
          ? null
          : Number(body.minOrderAmount),
    active: typeof body.active === "boolean" ? body.active : undefined,
  });
  return NextResponse.json({ ok: true });
}
