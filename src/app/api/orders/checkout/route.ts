import { NextRequest, NextResponse } from "next/server";
import { invalidPhoneMessage } from "@/lib/phone/israeli-mobile";
import { hypCheckoutErrorMessage } from "@/lib/payments/hyp";
import { placeVerifiedOrder } from "@/lib/orders/place-verified-order";
import type { CheckoutLineInput } from "@/lib/orders/trusted-cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localeOf(value: unknown): "ar" | "he" | "en" {
  return value === "he" || value === "en" ? value : "ar";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    requestId?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    locale?: string;
    paymentMethod?: string;
    items?: CheckoutLineInput[];
  } | null;
  const locale = localeOf(body?.locale);
  if (!body?.requestId || !body.customerName?.trim() || !body.customerPhone?.trim() || !body.items?.length) {
    return NextResponse.json(
      { ok: false, code: "INVALID_PHONE", message: invalidPhoneMessage(locale) },
      { status: 400 }
    );
  }
  let result: Awaited<ReturnType<typeof placeVerifiedOrder>>;
  try {
    result = await placeVerifiedOrder({
      requestId: body.requestId,
      customerId: "guest-checkout",
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      notes: body.notes,
      locale,
      paymentMethod: body.paymentMethod,
      items: body.items,
    });
  } catch (error) {
    console.error("[checkout] placeVerifiedOrder failed", error);
    return NextResponse.json(
      {
        ok: false,
        code: "CHECKOUT_FAILED",
        message:
          locale === "he"
            ? "לא ניתן לשלוח את ההזמנה כרגע. נסו שוב."
            : locale === "en"
              ? "Could not place the order right now. Please try again."
              : "تعذر إرسال الطلب حاليًا. حاول مرة أخرى.",
      },
      { status: 500 }
    );
  }
  if (!result.ok) {
    const code = result.code;
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
          : code === "PRICE_UNAVAILABLE"
            ? locale === "he"
              ? "לא ניתן לאמת את מחירי ההזמנה. רעננו את התפריט ונסו שוב."
              : locale === "en"
                ? "The order prices could not be verified. Refresh the menu and try again."
                : "تعذر التحقق من أسعار الطلب. حدّث القائمة وحاول مرة أخرى."
            : code === "HYP_NOT_CONFIGURED" || code === "HYP_PAYMENT_LINK_FAILED"
              ? hypCheckoutErrorMessage(code, locale)
              : code === "INVALID_PHONE"
                ? invalidPhoneMessage(locale)
                : locale === "he"
                  ? "לא ניתן לשלוח את ההזמנה כרגע. נסו שוב."
                  : locale === "en"
                    ? "Could not place the order right now. Please try again."
                    : "تعذر إرسال الطلب حاليًا. حاول مرة أخرى.";
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
    printQueued: result.printQueued === true,
    awaitingPayment: result.awaitingPayment === true,
    paymentUrl: "paymentUrl" in result ? result.paymentUrl : undefined,
  });
}
