import { NextRequest, NextResponse } from "next/server";
import { checkoutWithCoupon } from "@/lib/coupons/server";
import { COUPON_ERROR_TEXT, type CouponErrorCode } from "@/lib/coupons/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    requestId?: string;
    couponCode?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    locale?: "ar" | "he" | "en";
    paymentMethod?: string;
    paymentStatus?: string;
    items?: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      basePrice?: number;
      notes?: string;
      kitchenNotes?: string[];
      modifiers?: unknown[];
    }>;
  } | null;
  const locale = body?.locale === "he" || body?.locale === "en" ? body.locale : "ar";
  if (!body?.customerName?.trim() || !body.items?.length || !body.couponCode || !body.requestId) {
    return NextResponse.json(
      { ok: false, code: "INVALID", message: COUPON_ERROR_TEXT.INVALID[locale] },
      { status: 400 }
    );
  }
  const result = await checkoutWithCoupon({
    requestId: body.requestId,
    couponCode: body.couponCode,
    customerId: body.customerId || "guest-checkout",
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    notes: body.notes,
    locale,
    paymentMethod: body.paymentMethod,
    paymentStatus: body.paymentStatus,
    items: body.items,
  });
  if (!result.ok) {
    const code = (result.code || "INVALID") as CouponErrorCode | "ORDERING_PAUSED";
    const message =
      code === "ORDERING_PAUSED"
        ? locale === "he"
          ? "ההזמנות מושבתות כרגע"
          : locale === "en"
            ? "Orders are paused right now"
            : "الطلبات متوقفة حالياً"
        : COUPON_ERROR_TEXT[code][locale];
    return NextResponse.json({ ok: false, code, message }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    total: result.total,
    discountAmount: result.discountAmount,
    subtotal: result.subtotal,
    replayed: result.replayed,
  });
}
