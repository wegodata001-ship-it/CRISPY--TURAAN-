import { decideKitchenRelease } from "@/lib/payments/hyp/engine";
import { isHypPaymentFlowActive } from "@/lib/payments/hyp/config";

export type PrintOrderGateInput = {
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  requiresOnlinePayment?: boolean | null;
  awaitingHypPayment?: boolean | null;
};

export type PrintPaymentGateOptions = {
  /** Injected in tests. Defaults to server env via isHypPaymentFlowActive(). */
  hypPaymentsEnabled?: boolean;
};

/**
 * Shared kitchen print gate for NEW_ORDER enqueue, REPRINT, claim, approve, and retry.
 * When Hyp is OFF, preserves legacy cash+card pending printing.
 * Staging mock uses the same await-paid path without real Hyp credentials.
 */
export function orderKitchenPrintBlockReason(
  order: PrintOrderGateInput | null | undefined,
  options?: PrintPaymentGateOptions
): string | null {
  if (!order) return "order_not_found";

  const hypPaymentsEnabled = options?.hypPaymentsEnabled ?? isHypPaymentFlowActive();
  const decision = decideKitchenRelease({
    hypPaymentsEnabled,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    requiresOnlinePayment: order.requiresOnlinePayment,
    awaitingHypPayment: order.awaitingHypPayment,
  });

  if (decision.allow) return null;
  if (decision.reason === "order_cancelled") return "order_cancelled";
  if (decision.reason === "card_payment_failed") return "payment_not_collectable";
  if (decision.reason === "card_awaiting_payment") return "awaiting_card_payment";
  return "payment_blocked";
}

/** True when an agent/admin action may send this order to the kitchen printer. */
export function mayReleaseOrderToKitchen(
  order: PrintOrderGateInput | null | undefined,
  options?: PrintPaymentGateOptions
): boolean {
  return orderKitchenPrintBlockReason(order, options) == null;
}
