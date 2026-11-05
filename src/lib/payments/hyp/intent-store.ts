import type { DurableHypIntent } from "./confirm-engine";
import {
  evaluateTrustedPaymentConfirmation,
  markCouponRedeemed,
  markCouponRestored,
  markKitchenPrintReleased,
} from "./confirm-engine";
import { decideKitchenPrintClaim, shouldClearKitchenPrintClaimOnFailure } from "./kitchen-claim";
import { createHypResultToken, hashHypResultToken, type HypUiPaymentStatus } from "./result-session";

/**
 * In-memory durable intent store for unit tests.
 * Simulates Firestore transactions for confirm / kitchen claim / review / abandon.
 */
export class MemoryHypPaymentIntentStore {
  private readonly byRequestId = new Map<string, DurableHypIntent>();
  private readonly byOrderRef = new Map<string, string>();
  private readonly byResultTokenHash = new Map<string, string>();
  private readonly locks = new Map<string, Promise<void>>();

  clear() {
    this.byRequestId.clear();
    this.byOrderRef.clear();
    this.byResultTokenHash.clear();
    this.locks.clear();
  }

  getByRequestId(requestId: string) {
    return this.byRequestId.get(requestId) ?? null;
  }

  getByOrderRef(orderRef: string) {
    const requestId = this.byOrderRef.get(orderRef);
    return requestId ? this.getByRequestId(requestId) : null;
  }

  getByResultToken(token: string) {
    const hash = hashHypResultToken(token);
    const requestId = this.byResultTokenHash.get(hash);
    return requestId ? this.getByRequestId(requestId) : null;
  }

  /** Persist intent before SIGN / redirect. Required for trusted confirmation. */
  saveDurable(intent: DurableHypIntent) {
    if (!intent.orderId || !intent.orderRef) {
      throw new Error("intent_not_durable");
    }
    this.byRequestId.set(intent.requestId, { ...intent });
    this.byOrderRef.set(intent.orderRef, intent.requestId);
    if (intent.resultTokenHash) {
      this.byResultTokenHash.set(intent.resultTokenHash, intent.requestId);
    }
  }

  attachPaymentUrl(requestId: string, paymentUrl: string) {
    const current = this.getByRequestId(requestId);
    if (!current) return null;
    const next = { ...current, paymentUrl, status: "redirected" as const };
    this.saveDurable(next);
    return next;
  }

  private async withLock<T>(requestId: string, fn: () => T | Promise<T>): Promise<T> {
    const previous = this.locks.get(requestId) ?? Promise.resolve();
    let releaseCurrent!: () => void;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    const chain = previous.then(() => current);
    this.locks.set(requestId, chain);
    await previous;
    try {
      return await fn();
    } finally {
      releaseCurrent();
      if (this.locks.get(requestId) === chain) {
        this.locks.delete(requestId);
      }
    }
  }

  async confirmVerifiedPayment(input: {
    orderRef: string;
    transactionId: string;
    amount: number;
    masof?: string;
    coin?: number;
    nowMs: number;
  }): Promise<
    | {
        ok: true;
        alreadyPaid: boolean;
        releaseKitchen: boolean;
        finalizeCoupon: boolean;
        intent: DurableHypIntent;
        resultToken: string;
      }
    | { ok: false; code: string; message: string; intent?: DurableHypIntent }
  > {
    const existing = this.getByOrderRef(input.orderRef);
    if (!existing) {
      return { ok: false, code: "INTENT_NOT_FOUND", message: "No durable intent" };
    }

    return this.withLock(existing.requestId, () => {
      const latest = this.getByRequestId(existing.requestId);
      const decision = evaluateTrustedPaymentConfirmation({
        intent: latest,
        verified: {
          transactionId: input.transactionId,
          orderRef: input.orderRef,
          amount: input.amount,
          masof: input.masof,
          coin: input.coin,
        },
        nowMs: input.nowMs,
      });
      if (!decision.ok) return decision;
      const resultToken = createHypResultToken();
      const next: DurableHypIntent = {
        ...decision.intent,
        resultTokenHash: hashHypResultToken(resultToken),
        resultStatus: "paid",
        adminReviewRequired: false,
      };
      this.saveDurable(next);
      return { ...decision, intent: next, resultToken };
    });
  }

  async claimKitchenPrint(requestId: string, claimId: string, nowMs: number) {
    return this.withLock(requestId, () => {
      const intent = this.getByRequestId(requestId);
      const decision = decideKitchenPrintClaim({
        state: intent,
        claimId,
        nowMs,
      });
      if (decision.action === "claim" && intent) {
        this.saveDurable({
          ...intent,
          kitchenPrintClaimId: claimId,
          kitchenPrintClaimedAtMs: nowMs,
        });
      }
      return { decision, intent: this.getByRequestId(requestId) };
    });
  }

  async completeKitchenPrint(requestId: string, claimId: string, queued: boolean) {
    return this.withLock(requestId, () => {
      const intent = this.getByRequestId(requestId);
      if (!intent) return { released: false, intent };
      if (queued) {
        const next = markKitchenPrintReleased({
          ...intent,
          kitchenPrintClaimId: null,
          kitchenPrintClaimedAtMs: null,
        });
        this.saveDurable(next);
        return { released: true, intent: next };
      }
      if (shouldClearKitchenPrintClaimOnFailure({ state: intent, claimId })) {
        this.saveDurable({
          ...intent,
          kitchenPrintClaimId: null,
          kitchenPrintClaimedAtMs: null,
        });
      }
      return { released: false, intent: this.getByRequestId(requestId) };
    });
  }

  /** Legacy helper used by older tests — wraps claim + complete. */
  releaseKitchenOnce(requestId: string) {
    const intent = this.getByRequestId(requestId);
    if (!intent || intent.status !== "paid") return { released: false, intent };
    if (intent.kitchenPrintReleased) return { released: false, intent };
    const next = markKitchenPrintReleased({
      ...intent,
      kitchenPrintClaimId: null,
      kitchenPrintClaimedAtMs: null,
    });
    this.saveDurable(next);
    return { released: true, intent: next };
  }

  redeemCouponOnce(requestId: string) {
    const intent = this.getByRequestId(requestId);
    if (!intent || intent.status !== "paid") return { redeemed: false, intent };
    if (intent.couponStatus === "redeemed" || intent.couponStatus === "none" || !intent.couponCode) {
      return { redeemed: false, intent };
    }
    if (intent.couponStatus !== "held") return { redeemed: false, intent };
    const next = markCouponRedeemed(intent);
    this.saveDurable(next);
    return { redeemed: true, intent: next };
  }

  restoreCouponIfUnpaid(requestId: string) {
    const intent = this.getByRequestId(requestId);
    if (!intent || intent.status === "paid") return { restored: false, intent };
    if (intent.couponStatus !== "held") return { restored: false, intent };
    const next = markCouponRestored(intent);
    this.saveDurable(next);
    return { restored: true, intent: next };
  }

  async flagForReview(requestId: string) {
    return this.withLock(requestId, () => {
      const intent = this.getByRequestId(requestId);
      if (!intent) return { ok: false as const, reason: "missing_intent" };
      if (intent.status === "paid") return { ok: false as const, reason: "already_paid" };
      if (intent.status === "needs_review" || intent.adminReviewRequired) {
        return { ok: true as const, alreadyFlagged: true as const };
      }
      this.saveDurable({
        ...intent,
        status: "needs_review",
        adminReviewRequired: true,
        resultStatus: "pending",
      });
      return { ok: true as const, alreadyFlagged: false as const };
    });
  }

  async abandonAfterReview(requestId: string) {
    return this.withLock(requestId, () => {
      const intent = this.getByRequestId(requestId);
      if (!intent) return { ok: false as const, reason: "missing_intent" };
      if (intent.status === "paid") return { ok: false as const, reason: "already_paid" };
      this.saveDurable({
        ...intent,
        status: "cancelled",
        adminReviewRequired: false,
        resultStatus: "cancelled",
      });
      const coupon = this.restoreCouponIfUnpaid(requestId);
      return { ok: true as const, couponRestored: coupon.restored };
    });
  }

  recordBrowserOutcome(orderRef: string, status: Exclude<HypUiPaymentStatus, "paid">, code?: string) {
    const intent = this.getByOrderRef(orderRef);
    if (!intent || intent.status === "paid") return { ok: false as const, resultToken: "" };
    const resultToken = createHypResultToken();
    const nextStatus =
      status === "cancelled" ? ("cancelled" as const) : status === "failed" ? ("failed" as const) : intent.status;
    this.saveDurable({
      ...intent,
      status: status === "pending" ? intent.status : nextStatus,
      resultTokenHash: hashHypResultToken(resultToken),
      resultStatus: status,
    });
    void code;
    return { ok: true as const, resultToken };
  }

  trustedResultView(token: string): { status: HypUiPaymentStatus; orderLabel?: string } | null {
    const intent = this.getByResultToken(token);
    if (!intent?.resultStatus) return null;
    if (intent.resultStatus === "paid" && intent.status !== "paid") {
      return { status: "pending" };
    }
    return {
      status: intent.resultStatus,
      orderLabel:
        intent.resultStatus === "paid" && intent.orderNumber
          ? `#…${intent.orderNumber.slice(-4)}`
          : undefined,
    };
  }
}
