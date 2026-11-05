import { NextRequest, NextResponse } from "next/server";
import { checkoutWithCoupon } from "@/lib/coupons/server";
import { COUPON_ERROR_TEXT, type CouponErrorCode } from "@/lib/coupons/engine";
import { invalidPhoneMessage } from "@/lib/phone/israeli-mobile";
import { hypCheckoutErrorMessage } from "@/lib/payments/hyp";
import { priceCheckoutItems, type CheckoutLineInput } from "@/lib/orders/trusted-cart";

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
    items?: CheckoutLineInput[];
  } | null;
  const locale = body?.locale === "he" || body?.locale === "en" ? body.locale : "ar";
  if (
    !body?.customerName?.trim() ||
    !body.items?.length ||
    !body.couponCode ||
    !body.requestId ||
    !body.customerPhone?.trim()
  ) {
    return NextResponse.json(
      { ok: false, code: "INVALID_PHONE", message: invalidPhoneMessage(locale) },
      { status: 400 }
    );
  }
  const priced = await priceCheckoutItems(body.items, locale);
  if (!priced.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "PRICE_UNAVAILABLE",
        message:
          locale === "he"
            ? "לא ניתן לאמת את מחירי ההזמנה. רעננו את התפריט ונסו שוב."
            : locale === "en"
              ? "The order prices could not be verified. Refresh the menu and try again."
              : "تعذر التحقق من أسعار الطلب. حدّث القائمة وحاول مرة أخرى.",
      },
      { status: 409 }
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
    items: priced.items,
  });
  if (!result.ok) {
    const code = result.code || "INVALID";
    const message =
      code === "ORDERING_PAUSED"
        ? locale === "he"
          ? "ההזמנות מושבתות כרגע"
          : locale === "en"
            ? "Orders are paused right now"
            : "الطلبات متوقفة حالياً"
        : code === "PRINT_NOT_QUEUED"
          ? locale === "he"
            ? "ההזמנה נשמרה, אבל תור ההדפסה לא אישר קבלה. נסו שוב בלי ליצור הזמנה שנייה."
            : locale === "en"
              ? "The order was saved, but the print queue did not confirm it. Retry without creating another order."
              : "تم حفظ الطلب، لكن قائمة الطباعة لم تؤكد الاستلام. أعد المحاولة ولن يُنشأ طلب آخر."
          : code === "HYP_NOT_CONFIGURED" || code === "HYP_PAYMENT_LINK_FAILED"
            ? hypCheckoutErrorMessage(code, locale)
            : code === "INVALID_PHONE"
              ? invalidPhoneMessage(locale)
              : COUPON_ERROR_TEXT[code as CouponErrorCode]?.[locale] ||
                (locale === "he"
                  ? "הקופון אינו תקף"
                  : locale === "en"
                    ? "The coupon is not valid"
                    : "الكوبون غير صالح");
    return NextResponse.json(
      {
        ok: false,
        code,
        message,
        orderSaved: "orderSaved" in result ? result.orderSaved : false,
        orderId: "orderId" in result ? result.orderId : undefined,
        orderNumber: "orderNumber" in result ? result.orderNumber : undefined,
      },
      { status: 409 }
    );
  }
  return NextResponse.json({
    ok: true,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    total: result.total,
    discountAmount: result.discountAmount,
    subtotal: result.subtotal,
    replayed: result.replayed,
    printQueued: result.printQueued === true,
    awaitingPayment: result.awaitingPayment === true,
    paymentUrl: "paymentUrl" in result ? result.paymentUrl : undefined,
  });
}
