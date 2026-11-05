/**
 * Kitchen workflow gate for orders that require trusted online card payment.
 * Driven by server-written `requiresOnlinePayment` (not client env flags),
 * so Firestore rules and the admin UI share the same decision.
 */

import { normalizeOrderStatus } from "@/lib/orders/operations";
import type { OrderStatus, PaymentStatus } from "@/types";

export type KitchenActionOrder = {
  status?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null | PaymentStatus;
  /** Server-only flag set at Hyp/Mock checkout create. */
  requiresOnlinePayment?: boolean | null;
  awaitingHypPayment?: boolean | null;
};

export type KitchenActionBlockReason =
  | "order_cancelled"
  | "awaiting_online_payment"
  | "payment_not_collectable";

const KITCHEN_WORKFLOW_STATUSES = new Set<OrderStatus>(["preparing", "ready", "delivered"]);

export function orderRequiresOnlinePayment(order: KitchenActionOrder | null | undefined): boolean {
  if (!order) return false;
  // Trusted server flag wins. Legacy awaitingHypPayment covers older staging docs.
  return order.requiresOnlinePayment === true || order.awaitingHypPayment === true;
}

export function effectiveOrderPaymentStatus(order: KitchenActionOrder | null | undefined): PaymentStatus {
  const value = order?.paymentStatus || "pending";
  if (value === "paid" || value === "failed" || value === "refunded" || value === "pending") return value;
  return "pending";
}

/**
 * Whether staff may move this order into preparing / ready / delivered.
 * Cancel and staying on received are always allowed from this helper's perspective
 * (cancel is handled separately by callers).
 */
export function kitchenWorkflowBlockReason(
  order: KitchenActionOrder | null | undefined,
  nextStatus: string
): KitchenActionBlockReason | null {
  if (!order) return "awaiting_online_payment";
  const canonicalNext = normalizeOrderStatus(nextStatus);
  if (canonicalNext === "cancelled") return null;
  if (!KITCHEN_WORKFLOW_STATUSES.has(canonicalNext)) return null;

  if (normalizeOrderStatus(order.status) === "cancelled") return "order_cancelled";

  if (!orderRequiresOnlinePayment(order)) return null;

  const paymentStatus = effectiveOrderPaymentStatus(order);
  if (paymentStatus === "paid") return null;
  if (paymentStatus === "failed" || paymentStatus === "refunded") return "payment_not_collectable";
  return "awaiting_online_payment";
}

export function canAdvanceKitchenWorkflow(
  order: KitchenActionOrder | null | undefined,
  nextStatus: string
): boolean {
  return kitchenWorkflowBlockReason(order, nextStatus) == null;
}

/** Browser kitchen ticket — same payment gate as workflow advance. */
export function browserKitchenPrintBlockReason(
  order: KitchenActionOrder | null | undefined
): KitchenActionBlockReason | null {
  if (!order) return "awaiting_online_payment";
  if (normalizeOrderStatus(order.status) === "cancelled") return "order_cancelled";
  if (!orderRequiresOnlinePayment(order)) return null;
  const paymentStatus = effectiveOrderPaymentStatus(order);
  if (paymentStatus === "paid") return null;
  if (paymentStatus === "failed" || paymentStatus === "refunded") return "payment_not_collectable";
  return "awaiting_online_payment";
}

export function canPrintKitchenTicketBrowser(order: KitchenActionOrder | null | undefined): boolean {
  return browserKitchenPrintBlockReason(order) == null;
}

/** Staff client must not write these fields — Admin SDK / Hyp confirm only. */
export const SERVER_ONLY_ORDER_PAYMENT_KEYS = [
  "paymentStatus",
  "requiresOnlinePayment",
  "awaitingHypPayment",
  "hypOrderRef",
  "hypTransactionId",
  "paidAt",
  "phoneVerified",
  "phoneVerifiedAt",
] as const;

export function patchTouchesServerOnlyPaymentFields(patch: Record<string, unknown>): boolean {
  return SERVER_ONLY_ORDER_PAYMENT_KEYS.some((key) => Object.prototype.hasOwnProperty.call(patch, key));
}

export function kitchenActionBlockMessage(
  reason: KitchenActionBlockReason,
  locale: "ar" | "he" | "en" = "ar"
): string {
  if (reason === "order_cancelled") {
    if (locale === "he") return "ההזמנה בוטלה";
    if (locale === "en") return "The order was cancelled";
    return "تم إلغاء الطلب";
  }
  if (reason === "payment_not_collectable") {
    if (locale === "he") return "לא ניתן לשלוח למטבח — התשלום נכשל או הוחזר";
    if (locale === "en") return "Cannot send to kitchen — payment failed or was refunded";
    return "لا يمكن إرسال الطلب للمطبخ — فشل الدفع أو تم استرجاعه";
  }
  if (locale === "he") return "ממתין לתשלום באשראי. לא ניתן להכין או להדפיס לפני אישור התשלום.";
  if (locale === "en") return "Awaiting card payment. Kitchen prep and print stay locked until payment is confirmed.";
  return "بانتظار الدفع بالبطاقة. التحضير والطباعة مقفولان حتى تأكيد الدفع.";
}
