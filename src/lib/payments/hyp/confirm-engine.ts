import { amountsMatch } from "./amount";
import { applyPaymentVerified, markIntentFailed } from "./engine";
import type { HypPaymentIntent, HypPaymentIntentStatus } from "./types";

export type DurableHypIntent = HypPaymentIntent & {
  paymentUrl?: string;
  expectedMasof?: string;
  confirmLock?: boolean;
  kitchenPrintReleased?: boolean;
  kitchenPrintClaimId?: string | null;
  kitchenPrintClaimedAtMs?: number | null;
  couponStatus?: "none" | "held" | "redeemed" | "restored";
  resultTokenHash?: string;
  resultStatus?: "paid" | "failed" | "cancelled" | "pending";
  adminReviewRequired?: boolean;
};

export type ConfirmPaymentDecision =
  | {
      ok: true;
      alreadyPaid: boolean;
      releaseKitchen: boolean;
      finalizeCoupon: boolean;
      intent: DurableHypIntent;
    }
  | {
      ok: false;
      code:
        | "INTENT_NOT_FOUND"
        | "INTENT_NOT_DURABLE"
        | "ALREADY_PAID_OTHER_TX"
        | "AMOUNT_MISMATCH"
        | "ORDER_MISMATCH"
        | "MERCHANT_MISMATCH"
        | "CURRENCY_MISMATCH"
        | "PAYMENT_DECLINED"
        | "VERIFY_INCONCLUSIVE"
        | "INTENT_TERMINAL";
      message: string;
      intent?: DurableHypIntent;
    };

/**
 * Requires a durable intent linked to an order before any paid transition.
 * Browser redirect alone never pays; caller must pass VERIFY-proven fields.
 */
export function evaluateTrustedPaymentConfirmation(input: {
  intent: DurableHypIntent | null | undefined;
  verified: {
    transactionId: string;
    orderRef: string;
    amount: number;
    masof?: string;
    coin?: number;
  };
  nowMs: number;
  intentTtlMs?: number;
}): ConfirmPaymentDecision {
  const intent = input.intent;
  if (!intent) {
    return {
      ok: false,
      code: "INTENT_NOT_FOUND",
      message: "No durable payment intent exists for this Hyp Order reference",
    };
  }
  if (!intent.orderId || !intent.orderRef || !(intent.amount > 0)) {
    return {
      ok: false,
      code: "INTENT_NOT_DURABLE",
      message: "Payment intent is missing durable order linkage",
    };
  }
  if (intent.orderRef !== input.verified.orderRef) {
    return { ok: false, code: "ORDER_MISMATCH", message: "Order reference mismatch", intent };
  }
  if (!amountsMatch(intent.amount, input.verified.amount)) {
    return { ok: false, code: "AMOUNT_MISMATCH", message: "Amount mismatch", intent };
  }
  if (intent.expectedMasof && input.verified.masof && intent.expectedMasof !== input.verified.masof) {
    return { ok: false, code: "MERCHANT_MISMATCH", message: "Terminal/Masof mismatch", intent };
  }
  if (
    input.verified.coin != null &&
    intent.currencyCoin != null &&
    Number(input.verified.coin) !== Number(intent.currencyCoin)
  ) {
    return { ok: false, code: "CURRENCY_MISMATCH", message: "Currency/Coin mismatch", intent };
  }

  if (intent.status === "paid") {
    const sameTx = intent.hypTransactionId === input.verified.transactionId;
    if (!sameTx && intent.hypTransactionId) {
      return {
        ok: false,
        code: "ALREADY_PAID_OTHER_TX",
        message: "Intent already paid with a different Hyp transaction id",
        intent,
      };
    }
    return {
      ok: true,
      alreadyPaid: true,
      releaseKitchen: intent.kitchenPrintReleased !== true,
      finalizeCoupon: intent.couponStatus === "held",
      intent,
    };
  }

  // Local cancelled / needs_review / expired / failed UI flags are NOT proof of Hyp decline —
  // a late VERIFY with trusted fields may still mark paid (money may already be captured).

  const applied = applyPaymentVerified(intent, input.verified.transactionId, input.nowMs);
  const next: DurableHypIntent = {
    ...applied.intent,
    paymentUrl: intent.paymentUrl,
    expectedMasof: intent.expectedMasof,
    couponStatus: intent.couponStatus,
    kitchenPrintReleased: intent.kitchenPrintReleased === true,
    kitchenPrintClaimId: intent.kitchenPrintClaimId ?? null,
    kitchenPrintClaimedAtMs: intent.kitchenPrintClaimedAtMs ?? null,
    adminReviewRequired: false,
    confirmLock: false,
  };

  return {
    ok: true,
    alreadyPaid: false,
    releaseKitchen: true,
    finalizeCoupon: intent.couponStatus === "held" || Boolean(intent.couponCode),
    intent: next,
  };
}

export function markKitchenPrintReleased(intent: DurableHypIntent): DurableHypIntent {
  return { ...intent, kitchenPrintReleased: true };
}

export function markCouponRedeemed(intent: DurableHypIntent): DurableHypIntent {
  return { ...intent, couponStatus: "redeemed" };
}

export function markCouponRestored(intent: DurableHypIntent): DurableHypIntent {
  if (intent.status === "paid" || intent.couponStatus === "redeemed") return intent;
  return { ...intent, couponStatus: "restored" };
}

export function applyIntentTerminalStatus(
  intent: DurableHypIntent,
  status: Extract<HypPaymentIntentStatus, "failed" | "cancelled" | "expired">
): DurableHypIntent {
  if (intent.status === "paid") return intent;
  return { ...markIntentFailed(intent, status), couponStatus: intent.couponStatus };
}

/**
 * Network / transport failure while talking to Hyp VERIFY.
 * Must NOT mark the payment failed — reconcile later.
 */
export function isInconclusiveVerifyFailure(code: string | undefined): boolean {
  return code === "NETWORK" || code === "VERIFY_INCONCLUSIVE" || code === "DISABLED";
}
