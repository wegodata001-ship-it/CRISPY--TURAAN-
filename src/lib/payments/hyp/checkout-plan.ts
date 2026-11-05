import { isHypPayConfigured, isHypPaymentsFlagEnabled } from "./config";
import { evaluateHypRealPayEnvironment } from "./env-gate";
import { isHypStagingMockEnabled } from "./staging-mock";

export type CheckoutSettlementMode =
  | { kind: "legacy_print" }
  | { kind: "hyp_card_awaiting_payment" }
  | { kind: "hyp_flag_incomplete_config"; code: "HYP_NOT_CONFIGURED" };

export function isCardPaymentMethod(paymentMethod?: string | null): boolean {
  const method = (paymentMethod || "cash").trim().toLowerCase();
  return method === "card" || method === "credit" || method === "hyp";
}

/**
 * Decides how checkout should settle after OTP + server pricing.
 * - Flag OFF → legacy (cash and card both print as today).
 * - Flag ON + card + missing creds → hard error (no silent cash fallback).
 * - Flag ON + card + configured → awaiting Hyp payment (no kitchen yet).
 */
export function resolveCheckoutSettlementMode(input: {
  paymentMethod?: string | null;
  hypFlagEnabled: boolean;
  hypConfigured: boolean;
}): CheckoutSettlementMode {
  if (!isCardPaymentMethod(input.paymentMethod)) {
    return { kind: "legacy_print" };
  }
  if (!input.hypFlagEnabled) {
    return { kind: "legacy_print" };
  }
  if (!input.hypConfigured) {
    return { kind: "hyp_flag_incomplete_config", code: "HYP_NOT_CONFIGURED" };
  }
  return { kind: "hyp_card_awaiting_payment" };
}

export function resolveCheckoutSettlementModeFromEnv(
  paymentMethod: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): CheckoutSettlementMode {
  // Local staging mock: card awaits mock payment without HYP_PAYMENTS_ENABLED or real keys.
  if (isHypStagingMockEnabled(env) && isCardPaymentMethod(paymentMethod)) {
    return { kind: "hyp_card_awaiting_payment" };
  }
  const environmentOk = evaluateHypRealPayEnvironment(env).ok;
  return resolveCheckoutSettlementMode({
    paymentMethod,
    hypFlagEnabled: isHypPaymentsFlagEnabled(env),
    // Env gate failure must not fall through to legacy kitchen print for card.
    hypConfigured: isHypPayConfigured(env) && environmentOk,
  });
}

/** Coupon redemptions for unpaid Hyp card checkouts stay held until trusted payment. */
export function couponRedemptionStatusForCheckout(mode: CheckoutSettlementMode): "redeemed" | "held" {
  return mode.kind === "hyp_card_awaiting_payment" ? "held" : "redeemed";
}

export function hypCheckoutErrorMessage(
  code: "HYP_NOT_CONFIGURED" | "HYP_PAYMENT_LINK_FAILED",
  locale: "ar" | "he" | "en"
): string {
  if (code === "HYP_NOT_CONFIGURED") {
    if (locale === "he") return "תשלום באשראי אינו מוגדר כרגע. נסו שוב מאוחר יותר או בחרו מזומן.";
    if (locale === "en") return "Card payment is not configured right now. Try again later or choose cash.";
    return "الدفع بالبطاقة غير مُعدّ حاليًا. حاول لاحقًا أو اختر الدفع نقدًا.";
  }
  if (locale === "he") return "לא ניתן לפתוח את דף התשלום כרגע. ההזמנה לא נשלחה למטבח. נסו שוב.";
  if (locale === "en") return "Could not open the payment page. The order was not sent to the kitchen. Please try again.";
  return "تعذر فتح صفحة الدفع. لم يُرسل الطلب للمطبخ. حاول مرة أخرى.";
}
