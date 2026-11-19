import { isCardPaymentMethod } from "@/lib/payments/hyp/checkout-plan";
import type { CheckoutClientResult } from "@/lib/orders/checkout-client-result";

/**
 * Client-side safety: a card checkout must redirect to Hyp (or staging mock)
 * and must never show the cash success screen without a paymentUrl.
 */
export function guardCardCheckoutResult(input: {
  paymentMethod: string;
  result: CheckoutClientResult;
  locale?: "ar" | "he" | "en";
}): CheckoutClientResult {
  if (!isCardPaymentMethod(input.paymentMethod)) return input.result;
  if (!input.result.success) return input.result;
  if ("paymentUrl" in input.result && input.result.paymentUrl) return input.result;

  const locale = input.locale || "ar";
  const error =
    locale === "he"
      ? "לא נפתח דף התשלום. ההזמנה לא אושרה כשולמה. נסו שוב או בחרו מזומן."
      : locale === "en"
        ? "The payment page did not open. The order was not marked paid. Try again or choose cash."
        : "لم تُفتح صفحة الدفع. لم يُعتبر الطلب مدفوعًا. حاول مرة أخرى أو اختر النقد.";

  return {
    success: false,
    error,
    code: "HYP_PAYMENT_LINK_FAILED",
  };
}
