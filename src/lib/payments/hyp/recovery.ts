/**
 * Recovery when Hyp charges successfully but the customer never returns
 * to our success URL (closed browser, lost connection, etc.).
 *
 * Hyp Pay (hosted page docs, developers.hyp.co.il/pay):
 *   SIGN → customer pays → redirect → server APISign VERIFY
 * Documented success redirect fields include Id, CCode, Amount, ACode, Order, Fild*, Sign.
 * Official Hyp Pay Pay docs do NOT document a payment-page IPN/webhook or inquireTransactions.
 * Hyp Enterprise documents Amazon SNS webhooks + inquireTransactions — different product surface.
 *
 * Therefore CRISPY must not assume Hyp Pay IPN exists, must not treat TTL/network as declined,
 * and must leave inconclusive intents pending for admin review + VERIFY when redirect params exist.
 */

export type HypRecoveryStrategy =
  | "await_customer_return_then_verify"
  | "admin_reconcile_with_verify"
  | "admin_review_queue"
  | "enterprise_webhook_if_migrated";

export type HypRecoveryPlan = {
  primary: HypRecoveryStrategy;
  fallbacks: HypRecoveryStrategy[];
  intentTtlMs: number;
  notes: string[];
  /** Hyp Pay hosted-page product: no documented IPN. */
  documentedPaymentPageWebhook: false;
  /** Hyp Pay hosted-page product: no documented transaction inquiry API. */
  documentedTransactionInquiry: false;
};

export const DEFAULT_HYP_INTENT_TTL_MS = 30 * 60 * 1000;

export function buildHypRecoveryPlan(intentTtlMs = DEFAULT_HYP_INTENT_TTL_MS): HypRecoveryPlan {
  return {
    primary: "await_customer_return_then_verify",
    fallbacks: ["admin_reconcile_with_verify", "admin_review_queue"],
    intentTtlMs,
    documentedPaymentPageWebhook: false,
    documentedTransactionInquiry: false,
    notes: [
      "Hyp Pay official flow is redirect + server VERIFY; browser success is never proof.",
      "Hyp Pay docs reviewed for this project do not document payment-page IPN/webhooks.",
      "Hyp Pay docs do not document a hosted-page transaction inquiry for abandoned returns.",
      "Hyp Enterprise webhooks (SNS) / inquireTransactions are a different product — do not wire unless terminal is Enterprise.",
      "Persist hypPaymentIntents (orderId, orderRef, amount, expectedMasof, coin) BEFORE giving the customer a payment URL.",
      "Return route runs VERIFY then atomic mark-paid + one kitchen print claim.",
      "If VERIFY transport fails, leave intent pending (inconclusive) — never treat network errors as declined.",
      "TTL expiry only flags needs_review for staff — never auto-cancel or auto-restore coupons (payment may have succeeded at Hyp).",
      "Admin abandon_after_review may cancel + restore coupon only when intent is still unpaid, inside a Firestore transaction.",
      "Admin confirm_redirect reuses VERIFY; late VERIFY may still mark paid even after needs_review.",
    ],
  };
}

export function isIntentExpired(
  createdAtMs: number,
  nowMs: number,
  ttlMs = DEFAULT_HYP_INTENT_TTL_MS
): boolean {
  return nowMs - createdAtMs > ttlMs;
}

export function hypPaySupportsDocumentedPaymentPageWebhook(): boolean {
  return false;
}

export function hypPaySupportsDocumentedTransactionInquiry(): boolean {
  return false;
}

/** After TTL, flag for admin review — do not treat as payment failure. */
export function shouldFlagIntentForAdminReview(
  createdAtMs: number,
  nowMs: number,
  status: string,
  ttlMs = DEFAULT_HYP_INTENT_TTL_MS
): boolean {
  if (status === "paid" || status === "needs_review") return false;
  if (status === "cancelled" || status === "failed" || status === "expired") return false;
  return isIntentExpired(createdAtMs, nowMs, ttlMs);
}
