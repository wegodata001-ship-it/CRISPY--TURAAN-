import type { HypPaymentIntent, HypPaymentIntentStatus } from "./types";

export type KitchenReleaseDecision =
  | { allow: true; reason: "cash_legacy" | "card_legacy_hyp_off" | "card_paid" }
  | { allow: false; reason: "card_awaiting_payment" | "card_payment_failed" | "order_cancelled" };

/**
 * Kitchen / printer / Android release gate.
 * - Hyp OFF: preserve today's behavior (cash + card both print while pending).
 * - Hyp ON: card orders wait for trusted `paid` before kitchen.
 * - Orders stamped `requiresOnlinePayment` (server create) always wait for `paid`,
 *   even if the env flag later flips — rules/UI share that field.
 */
export function decideKitchenRelease(input: {
  hypPaymentsEnabled: boolean;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  orderStatus?: string | null;
  requiresOnlinePayment?: boolean | null;
  awaitingHypPayment?: boolean | null;
}): KitchenReleaseDecision {
  if (input.orderStatus === "cancelled") {
    return { allow: false, reason: "order_cancelled" };
  }

  const method = (input.paymentMethod || "cash").toLowerCase();
  const paymentStatus = input.paymentStatus || "pending";
  const isCard = method === "card" || method === "credit" || method === "hyp";
  const stampedOnline =
    input.requiresOnlinePayment === true || input.awaitingHypPayment === true;
  const enforceOnlineCard = input.hypPaymentsEnabled || stampedOnline;

  if (!enforceOnlineCard) {
    if (paymentStatus === "failed" || paymentStatus === "refunded") {
      return { allow: false, reason: "card_payment_failed" };
    }
    return {
      allow: true,
      reason: isCard ? "card_legacy_hyp_off" : "cash_legacy",
    };
  }

  if (!isCard && !stampedOnline) {
    if (paymentStatus === "failed" || paymentStatus === "refunded") {
      return { allow: false, reason: "card_payment_failed" };
    }
    return { allow: true, reason: "cash_legacy" };
  }

  if (paymentStatus === "paid") {
    return { allow: true, reason: "card_paid" };
  }
  if (paymentStatus === "failed" || paymentStatus === "refunded") {
    return { allow: false, reason: "card_payment_failed" };
  }
  return { allow: false, reason: "card_awaiting_payment" };
}

/** Stable Hyp `Order` value derived from checkout request id. */
export function buildHypOrderRef(requestId: string): string {
  const compact = requestId.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
  return compact ? `CRISPY-${compact}` : "";
}

export function applyPaymentVerified(
  intent: HypPaymentIntent,
  transactionId: string,
  paidAtMs: number
): { intent: HypPaymentIntent; alreadyPaid: boolean; duplicateTransaction: boolean } {
  if (intent.status === "paid") {
    const duplicateTransaction =
      Boolean(intent.hypTransactionId) && intent.hypTransactionId !== transactionId;
    return {
      intent,
      alreadyPaid: true,
      duplicateTransaction,
    };
  }

  return {
    intent: {
      ...intent,
      status: "paid",
      hypTransactionId: transactionId,
      paidAtMs,
    },
    alreadyPaid: false,
    duplicateTransaction: false,
  };
}

export function markIntentFailed(
  intent: HypPaymentIntent,
  status: Extract<HypPaymentIntentStatus, "failed" | "cancelled" | "expired"> = "failed"
): HypPaymentIntent {
  if (intent.status === "paid") return intent;
  return { ...intent, status };
}

/**
 * Coupon handling policy used by later checkout wiring:
 * - Reserve/redeem only after unpaid order is created for card+Hyp.
 * - On failed / abandoned / cancelled unpaid card order → restore coupon.
 * - Never restore after a verified paid charge.
 */
export function shouldRestoreCouponAfterPaymentOutcome(input: {
  hypPaymentsEnabled: boolean;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  orderStatus?: string | null;
  intentStatus?: HypPaymentIntentStatus | null;
}): boolean {
  if (!input.hypPaymentsEnabled) return false;
  const method = (input.paymentMethod || "").toLowerCase();
  if (method !== "card" && method !== "credit" && method !== "hyp") return false;
  if (input.paymentStatus === "paid" || input.intentStatus === "paid") return false;
  if (input.orderStatus === "cancelled") return true;
  if (
    input.intentStatus === "failed" ||
    input.intentStatus === "cancelled" ||
    input.intentStatus === "expired"
  ) {
    return true;
  }
  return false;
}

export function createPaymentIntentDraft(input: {
  id: string;
  requestId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  createdAtMs: number;
  couponCode?: string;
  currencyCoin?: 1 | 2 | 3 | 4;
}): HypPaymentIntent | null {
  const orderRef = buildHypOrderRef(input.requestId);
  if (!orderRef || !(input.amount > 0)) return null;
  return {
    id: input.id,
    requestId: input.requestId,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    orderRef,
    amount: Math.round(input.amount * 100) / 100,
    currencyCoin: input.currencyCoin ?? 1,
    status: "created",
    couponCode: input.couponCode,
    createdAtMs: input.createdAtMs,
  };
}
