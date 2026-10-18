import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  COUPON_ERROR_TEXT,
  customerCouponKey,
  evaluateCoupon,
  normalizeCouponCode,
} from "@/lib/coupons/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    code?: string;
    subtotal?: number;
    customerPhone?: string;
    customerId?: string;
    locale?: "ar" | "he" | "en";
  } | null;
  const code = normalizeCouponCode(body?.code || "");
  const subtotal = Number(body?.subtotal);
  const locale = body?.locale === "he" || body?.locale === "en" ? body.locale : "ar";
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json(
      { ok: false, code: "INVALID", message: COUPON_ERROR_TEXT.INVALID[locale] },
      { status: 400 }
    );
  }
  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.coupons).doc(code).get();
  const data = snap.data();
  const customerKey = customerCouponKey(body?.customerPhone, body?.customerId);
  const used = await db.collection(COLLECTIONS.couponCustomerUses).doc(`${code}_${customerKey}`).get();
  const decision = evaluateCoupon({
    coupon: snap.exists
      ? {
          code,
          discountType: data?.discountType === "fixed" ? "fixed" : "percent",
          discountValue: Number(data?.discountValue) || 0,
          maxRedemptions: data?.maxRedemptions == null ? null : Number(data.maxRedemptions),
          usedCount: Number(data?.usedCount) || 0,
          active: data?.active !== false,
          startsAt: data?.startsAt ? String(data.startsAt) : null,
          expiresAt: data?.expiresAt ? String(data.expiresAt) : null,
          minOrderAmount: data?.minOrderAmount == null ? null : Number(data.minOrderAmount),
          onePerCustomer: data?.onePerCustomer === true,
        }
      : null,
    subtotal,
    now: new Date(),
    alreadyUsedByCustomer: used.exists,
  });
  if (!decision.ok) {
    return NextResponse.json(
      { ok: false, code: decision.code, message: COUPON_ERROR_TEXT[decision.code][locale] },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, quote: decision.quote });
}
