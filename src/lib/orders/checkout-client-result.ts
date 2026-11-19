/**
 * Maps /api/orders/checkout (and coupon checkout) JSON to UI success/failure.
 * Kept pure so HYP awaiting-payment responses are not mistaken for phone/format errors.
 */

export type CheckoutApiPayload = {
  ok?: boolean;
  message?: string;
  code?: string;
  orderId?: string;
  orderNumber?: string;
  printQueued?: boolean;
  /** True when kitchen print was intentionally skipped (e.g. PRINT_AUTO_NEW_ORDERS=false). */
  printSkipped?: boolean;
  paymentUrl?: string;
  awaitingPayment?: boolean;
};

export type CheckoutClientResult =
  | {
      success: true;
      data: { id: string; orderNumber: string };
      paymentUrl: string;
      printQueued: false;
      awaitingPayment: true;
    }
  | {
      success: true;
      data: { id: string; orderNumber: string };
      printQueued: true;
    }
  | {
      success: true;
      data: { id: string; orderNumber: string };
      printQueued: false;
      printSkipped: true;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

const GENERIC_CHECKOUT_ERROR = "تعذر إرسال الطلب. حاول مرة أخرى.";
const PHONE_FALLBACK = "أدخل رقم هاتف إسرائيلي بصيغة 05XXXXXXXX";
const HYP_LINK_FALLBACK = "تعذر فتح صفحة الدفع. لم يُرسل الطلب للمطبخ. حاول مرة أخرى.";

export function interpretCheckoutApiPayload(
  responseOk: boolean,
  payload: CheckoutApiPayload | null,
  options?: { coupon?: boolean }
): CheckoutClientResult {
  const coupon = options?.coupon === true;
  const generic = coupon ? "الكوبون غير صالح" : GENERIC_CHECKOUT_ERROR;

  if (!responseOk || !payload?.ok || !payload.orderId || !payload.orderNumber) {
    const message =
      payload?.message ||
      (payload?.code === "INVALID_PHONE" || payload?.code === "PHONE_NOT_VERIFIED"
        ? PHONE_FALLBACK
        : generic);
    return { success: false, error: message, code: payload?.code };
  }

  if (payload.paymentUrl) {
    return {
      success: true,
      data: { id: payload.orderId, orderNumber: payload.orderNumber },
      paymentUrl: payload.paymentUrl,
      printQueued: false,
      awaitingPayment: true,
    };
  }

  if (payload.awaitingPayment) {
    return {
      success: false,
      error: payload.message || HYP_LINK_FALLBACK,
      code: payload.code || "HYP_PAYMENT_LINK_FAILED",
    };
  }

  if (payload.printQueued) {
    return {
      success: true,
      data: { id: payload.orderId, orderNumber: payload.orderNumber },
      printQueued: true,
    };
  }

  // Staging/local: auto-print intentionally off — order succeeded; do not show PRINT_NOT_QUEUED.
  if (payload.printSkipped) {
    return {
      success: true,
      data: { id: payload.orderId, orderNumber: payload.orderNumber },
      printQueued: false,
      printSkipped: true,
    };
  }

  return {
    success: false,
    error: payload.message || generic,
    code: payload.code,
  };
}
