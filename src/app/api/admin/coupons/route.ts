import { NextRequest, NextResponse } from "next/server";
import { requireAdminOnly } from "@/lib/auth/verify-admin";
import { createCoupon, createCouponBatch, listCoupons, redeemedDiscountTotal, type CouponWriteInput } from "@/lib/coupons/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseWrite(body: Record<string, unknown>): CouponWriteInput {
  const max = body.maxRedemptions;
  return {
    code: typeof body.code === "string" ? body.code : undefined,
    campaignName: typeof body.campaignName === "string" ? body.campaignName : undefined,
    discountType: body.discountType === "fixed" ? "fixed" : "percent",
    discountValue: Number(body.discountValue) || 0,
    maxRedemptions: max == null || max === "" ? null : Number(max),
    onePerCustomer: body.onePerCustomer === true,
    startsAt: typeof body.startsAt === "string" ? body.startsAt : null,
    expiresAt: typeof body.expiresAt === "string" && body.expiresAt ? body.expiresAt : null,
    minOrderAmount:
      body.minOrderAmount == null || body.minOrderAmount === "" ? null : Number(body.minOrderAmount),
    active: body.active !== false,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminOnly(request);
  if (auth instanceof Response) return auth;
  const [coupons, discountGiven] = await Promise.all([listCoupons(), redeemedDiscountTotal()]);
  return NextResponse.json({ coupons, discountGiven });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOnly(request);
  if (auth instanceof Response) return auth;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    if (body.mode === "bulk") {
      const result = await createCouponBatch({
        ...parseWrite(body),
        count: Math.min(100, Math.max(1, Number(body.count) || 1)),
        prefix: String(body.prefix || "CRISPY"),
      });
      return NextResponse.json(result);
    }
    const code = await createCoupon(parseWrite(body));
    return NextResponse.json({ code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    const status = message === "CODE_EXISTS" || message === "CODE_REQUIRED" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
