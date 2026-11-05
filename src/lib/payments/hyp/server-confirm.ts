import { createHash, randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { confirmKitchenPrint } from "@/lib/orders/place-verified-order";
import { restoreCouponForCancelledOrder } from "@/lib/coupons/server";
import { amountsMatch, parseHypAmount } from "./amount";
import { createHypClient } from "./client";
import { loadHypPayConfig } from "./config";
import { confirmHypPaymentFromRedirect } from "./confirm-payment";
import type { DurableHypIntent } from "./confirm-engine";
import { decideKitchenPrintClaim, shouldClearKitchenPrintClaimOnFailure } from "./kitchen-claim";
import { parseHypQueryString } from "./query";
import {
  createHypResultToken,
  hashHypResultToken,
  hypResultTokensMatch,
  publicOrderLabel,
  type HypResultSessionView,
  type HypUiPaymentStatus,
} from "./result-session";
import {
  isHypStagingMockEnabled,
  isHypStagingMockTransactionId,
  STAGING_HYP_MOCK_MASOF,
  STAGING_HYP_MOCK_TX_PREFIX,
} from "./staging-mock";

function requestIdFromOrderRef(orderRef: string): string | null {
  const trimmed = orderRef.trim();
  if (!trimmed.startsWith("CRISPY-")) return null;
  const rest = trimmed.slice("CRISPY-".length);
  return rest || null;
}

function mapIntentDoc(id: string, data: FirebaseFirestore.DocumentData): DurableHypIntent {
  return {
    id,
    requestId: String(data.requestId || id),
    orderId: String(data.orderId || ""),
    orderNumber: String(data.orderNumber || ""),
    orderRef: String(data.orderRef || ""),
    amount: Number(data.amount) || 0,
    currencyCoin: (Number(data.currencyCoin) || 1) as 1 | 2 | 3 | 4,
    status: (data.status as DurableHypIntent["status"]) || "created",
    hypTransactionId: typeof data.hypTransactionId === "string" ? data.hypTransactionId : undefined,
    couponCode: typeof data.couponCode === "string" ? data.couponCode : undefined,
    createdAtMs: typeof data.createdAtMs === "number" ? data.createdAtMs : Date.now(),
    paidAtMs: typeof data.paidAtMs === "number" ? data.paidAtMs : undefined,
    paymentUrl: typeof data.paymentUrl === "string" ? data.paymentUrl : undefined,
    expectedMasof: typeof data.expectedMasof === "string" ? data.expectedMasof : undefined,
    kitchenPrintReleased: data.kitchenPrintReleased === true,
    kitchenPrintClaimId: typeof data.kitchenPrintClaimId === "string" ? data.kitchenPrintClaimId : null,
    kitchenPrintClaimedAtMs:
      typeof data.kitchenPrintClaimedAtMs === "number" ? data.kitchenPrintClaimedAtMs : null,
    couponStatus:
      (data.couponStatus as DurableHypIntent["couponStatus"]) || (data.couponCode ? "held" : "none"),
    resultTokenHash: typeof data.resultTokenHash === "string" ? data.resultTokenHash : undefined,
    resultStatus: data.resultStatus as DurableHypIntent["resultStatus"],
    adminReviewRequired: data.adminReviewRequired === true,
  };
}

/**
 * Prefer doc id lookup (requestId) — no composite index required.
 * Fallback: single-field equality on orderRef (Firestore auto single-field index).
 */
async function loadIntentByOrderRef(orderRef: string): Promise<DurableHypIntent | null> {
  const db = getAdminDb();
  const maybeRequestId = requestIdFromOrderRef(orderRef);
  if (maybeRequestId) {
    const byId = await db.collection(COLLECTIONS.hypPaymentIntents).doc(maybeRequestId).get();
    if (byId.exists) {
      const mapped = mapIntentDoc(byId.id, byId.data() || {});
      if (mapped.orderRef === orderRef || !mapped.orderRef) return mapped;
    }
  }

  const snap = await db
    .collection(COLLECTIONS.hypPaymentIntents)
    .where("orderRef", "==", orderRef)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  return mapIntentDoc(doc.id, doc.data());
}

export type PersistPaidResult =
  | { status: "marked_paid"; alreadyPaid: false; resultToken: string }
  | { status: "already_paid"; alreadyPaid: true; sameTransaction: boolean; resultToken: string };

async function persistPaidIntent(intent: DurableHypIntent, transactionId: string): Promise<PersistPaidResult> {
  const db = getAdminDb();
  const intentRef = db.collection(COLLECTIONS.hypPaymentIntents).doc(intent.requestId);
  const orderDocRef = db.collection(COLLECTIONS.orders).doc(intent.orderId);
  const couponCode = intent.couponCode;
  const redemptionRef =
    couponCode && intent.orderId
      ? db.collection(COLLECTIONS.couponRedemptions).doc(`${couponCode}_${intent.orderId}`)
      : null;
  const resultToken = createHypResultToken();
  const resultTokenHash = hashHypResultToken(resultToken);

  return db.runTransaction(async (tx) => {
    const intentSnap = await tx.get(intentRef);
    const orderSnap = await tx.get(orderDocRef);
    const redemptionSnap = redemptionRef ? await tx.get(redemptionRef) : null;
    const current = intentSnap.data() || {};
    const currentStatus = String(current.status || "");
    const existingTx = typeof current.hypTransactionId === "string" ? current.hypTransactionId : "";

    if (currentStatus === "paid") {
      if (redemptionRef && redemptionSnap?.exists && String(redemptionSnap.data()?.status || "") === "held") {
        tx.update(redemptionRef, { status: "redeemed", orderStatus: "received" });
      }
      if (intentSnap.exists && current.couponStatus === "held") {
        tx.set(
          intentRef,
          {
            couponStatus: "redeemed",
            resultTokenHash,
            resultStatus: "paid",
            adminReviewRequired: false,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        tx.set(
          intentRef,
          {
            resultTokenHash,
            resultStatus: "paid",
            adminReviewRequired: false,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      return {
        status: "already_paid" as const,
        alreadyPaid: true as const,
        sameTransaction: !existingTx || existingTx === transactionId,
        resultToken,
      };
    }

    // Never let a concurrent abandon/cancel win over a trusted VERIFY.
    const paidAtMs = intent.paidAtMs || Date.now();
    const couponStatus =
      current.couponStatus === "held" || Boolean(couponCode)
        ? "redeemed"
        : current.couponStatus || (couponCode ? "redeemed" : "none");
    tx.set(
      intentRef,
      {
        status: "paid",
        hypTransactionId: transactionId,
        paidAtMs,
        couponStatus,
        kitchenPrintReleased: current.kitchenPrintReleased === true,
        resultTokenHash,
        resultStatus: "paid",
        adminReviewRequired: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    if (orderSnap.exists) {
      const orderStatus = String(orderSnap.data()?.status || "");
      tx.set(
        orderDocRef,
        {
          paymentStatus: "paid",
          awaitingHypPayment: false,
          hypTransactionId: transactionId,
          paidAt: Timestamp.now(),
          // If a race cancelled the order, revive to received for kitchen.
          ...(orderStatus === "cancelled" ? { status: "received", cancelReason: FieldValue.delete() } : {}),
        },
        { merge: true }
      );
    }
    if (redemptionRef && redemptionSnap?.exists && String(redemptionSnap.data()?.status || "") === "held") {
      tx.update(redemptionRef, { status: "redeemed", orderStatus: "received" });
    }
    return {
      status: "marked_paid" as const,
      alreadyPaid: false as const,
      resultToken,
    };
  });
}

async function releaseKitchenIdempotent(requestId: string, orderId: string) {
  const db = getAdminDb();
  const intentRef = db.collection(COLLECTIONS.hypPaymentIntents).doc(requestId);
  const claimId = createHash("sha256").update(`${requestId}:${randomUUID()}`).digest("hex").slice(0, 32);
  const nowMs = Date.now();

  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(intentRef);
    if (!snap.exists) return { action: "deny" as const, reason: "missing" as const };
    const data = snap.data() || {};
    const decision = decideKitchenPrintClaim({
      state: {
        status: String(data.status || ""),
        kitchenPrintReleased: data.kitchenPrintReleased === true,
        kitchenPrintClaimId: typeof data.kitchenPrintClaimId === "string" ? data.kitchenPrintClaimId : null,
        kitchenPrintClaimedAtMs:
          typeof data.kitchenPrintClaimedAtMs === "number" ? data.kitchenPrintClaimedAtMs : null,
      },
      claimId,
      nowMs,
    });
    if (decision.action === "already_released") return decision;
    if (decision.action === "deny") return decision;
    tx.set(
      intentRef,
      {
        kitchenPrintClaimId: claimId,
        kitchenPrintClaimedAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return decision;
  });

  if (claim.action === "already_released") {
    return { printQueued: true, alreadyReleased: true };
  }
  if (claim.action === "deny") {
    return { printQueued: false, alreadyReleased: false, blocked: claim.reason };
  }

  const print = await confirmKitchenPrint(orderId);
  // Auto-print may be off in staging; still release kitchen path after trusted paid.
  const accepted = print.queued || print.reason === "auto_print_disabled";

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(intentRef);
    const data = snap.data() || {};
    if (accepted) {
      tx.set(
        intentRef,
        {
          kitchenPrintReleased: true,
          kitchenPrintClaimId: null,
          kitchenPrintClaimedAtMs: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }
    if (
      shouldClearKitchenPrintClaimOnFailure({
        state: {
          kitchenPrintReleased: data.kitchenPrintReleased === true,
          kitchenPrintClaimId: typeof data.kitchenPrintClaimId === "string" ? data.kitchenPrintClaimId : null,
        },
        claimId,
      })
    ) {
      tx.set(
        intentRef,
        {
          kitchenPrintClaimId: null,
          kitchenPrintClaimedAtMs: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });

  return { printQueued: accepted, alreadyReleased: false };
}

/**
 * Staging mock confirmation — no Hyp VERIFY / network.
 * Only runs when HYP_STAGING_MOCK gates pass.
 */
async function confirmHypStagingMockReturn(rawQuery: string) {
  const parsed = parseHypQueryString(rawQuery);
  const orderRef = (parsed.params.Order || "").trim();
  const cCode = (parsed.params.CCode || "").trim();
  const transactionId = (parsed.params.Id || parsed.params.id || "").trim();
  if (!orderRef) {
    return { ok: false as const, code: "MISSING_PARAMS", message: "Mock redirect missing Order" };
  }
  if (cCode && cCode !== "0") {
    return {
      ok: false as const,
      code: "PAYMENT_DECLINED",
      message: `Mock payment declined with CCode=${cCode}`,
      intent: (await loadIntentByOrderRef(orderRef)) || undefined,
    };
  }
  if (!isHypStagingMockTransactionId(transactionId)) {
    return {
      ok: false as const,
      code: "INVALID_MOCK_TX",
      message: "Mock confirmation requires a MOCK-TX transaction id",
    };
  }

  const intent = await loadIntentByOrderRef(orderRef);
  if (!intent) {
    return { ok: false as const, code: "INTENT_NOT_FOUND", message: "No durable payment intent for mock Order" };
  }

  const redirectAmount = parseHypAmount(parsed.params.Amount || "");
  if (redirectAmount != null && !amountsMatch(redirectAmount, intent.amount)) {
    return {
      ok: false as const,
      code: "AMOUNT_MISMATCH",
      message: "Mock amount does not match intent",
      intent,
    };
  }

  const expectedMasof = intent.expectedMasof || STAGING_HYP_MOCK_MASOF;
  const redirectMasof = (parsed.params.Masof || STAGING_HYP_MOCK_MASOF).trim();
  if (redirectMasof !== expectedMasof && redirectMasof !== STAGING_HYP_MOCK_MASOF) {
    return { ok: false as const, code: "MASOF_MISMATCH", message: "Mock Masof mismatch", intent };
  }

  return {
    ok: true as const,
    alreadyPaid: intent.status === "paid",
    releaseKitchen: true as const,
    finalizeCoupon: true as const,
    intent,
    transactionId: transactionId || `${STAGING_HYP_MOCK_TX_PREFIX}${intent.requestId.slice(0, 12)}`,
  };
}

/**
 * Confirm Hyp redirect on the server. Safe when Hyp is disabled (returns DISABLED).
 * Does not treat browser arrival as payment success.
 * Network VERIFY failures stay inconclusive — never mark payment failed.
 * Staging mock uses a separate gated path (no real Hyp VERIFY).
 */
export async function confirmHypReturnAndReleaseKitchen(rawQuery: string) {
  const confirmed = isHypStagingMockEnabled()
    ? await confirmHypStagingMockReturn(rawQuery)
    : await confirmHypPaymentFromRedirect({
        client: createHypClient(loadHypPayConfig()),
        rawQuery,
        loadIntentByOrderRef,
        expectedMasof: loadHypPayConfig().masof,
        expectedCoin: loadHypPayConfig().coin,
      });

  if (!confirmed.ok) {
    return confirmed;
  }

  const persisted = await persistPaidIntent(confirmed.intent, confirmed.transactionId);
  if (persisted.status === "already_paid" && !persisted.sameTransaction) {
    return {
      ok: false as const,
      code: "ALREADY_PAID_OTHER_TX",
      message: "Order already paid with a different Hyp transaction",
      intent: confirmed.intent,
    };
  }

  const kitchen = await releaseKitchenIdempotent(confirmed.intent.requestId, confirmed.intent.orderId);

  return {
    ok: true as const,
    alreadyPaid: confirmed.alreadyPaid || persisted.alreadyPaid,
    orderId: confirmed.intent.orderId,
    orderNumber: confirmed.intent.orderNumber,
    transactionId: confirmed.transactionId,
    printQueued: kitchen.printQueued,
    resultToken: persisted.resultToken,
  };
}

/** Record non-paid UI outcome without cancelling coupons; never overwrite paid. */
export async function recordHypBrowserOutcome(input: {
  orderRef?: string | null;
  status: Exclude<HypUiPaymentStatus, "paid">;
  code?: string;
}) {
  const orderRef = (input.orderRef || "").trim();
  if (!orderRef) {
    return { ok: false as const, resultToken: "" };
  }
  const intent = await loadIntentByOrderRef(orderRef);
  if (!intent) return { ok: false as const, resultToken: "" };

  const db = getAdminDb();
  const intentRef = db.collection(COLLECTIONS.hypPaymentIntents).doc(intent.requestId);
  const resultToken = createHypResultToken();
  const resultTokenHash = hashHypResultToken(resultToken);

  const saved = await db.runTransaction(async (tx) => {
    const snap = await tx.get(intentRef);
    if (!snap.exists) return { ok: false as const };
    const current = snap.data() || {};
    if (String(current.status || "") === "paid") {
      return { ok: false as const, alreadyPaid: true as const };
    }
    const nextStatus =
      input.status === "cancelled" ? "cancelled" : input.status === "failed" ? "failed" : String(current.status || "redirected");
    tx.set(
      intentRef,
      {
        ...(input.status === "pending" ? {} : { status: nextStatus }),
        resultTokenHash,
        resultStatus: input.status,
        lastBrowserOutcomeCode: input.code || null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true as const };
  });

  if (!saved.ok) return { ok: false as const, resultToken: "", alreadyPaid: "alreadyPaid" in saved };
  return { ok: true as const, resultToken, requestId: intent.requestId };
}

/**
 * Flag stale unpaid intent for admin review. Does NOT cancel order or restore coupon.
 * TTL / silence is not proof of payment failure.
 */
export async function flagHypIntentForAdminReview(requestId: string) {
  const db = getAdminDb();
  const intentRef = db.collection(COLLECTIONS.hypPaymentIntents).doc(requestId.trim());
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(intentRef);
    if (!snap.exists) return { ok: false as const, reason: "missing_intent" };
    const data = snap.data() || {};
    if (String(data.status || "") === "paid") return { ok: false as const, reason: "already_paid" };
    if (String(data.status || "") === "needs_review" || data.adminReviewRequired === true) {
      return { ok: true as const, alreadyFlagged: true as const, orderId: String(data.orderId || "") };
    }
    tx.set(
      intentRef,
      {
        status: "needs_review",
        adminReviewRequired: true,
        resultStatus: "pending",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true as const, alreadyFlagged: false as const, orderId: String(data.orderId || "") };
  });
}

/**
 * Admin-only: after manual Hyp portal check, abandon unpaid intent.
 * Transactional vs paid — never cancels a paid order or double-restores coupons.
 */
export async function abandonUnpaidHypIntentAfterReview(requestId: string) {
  const db = getAdminDb();
  const intentRef = db.collection(COLLECTIONS.hypPaymentIntents).doc(requestId.trim());

  const gate = await db.runTransaction(async (tx) => {
    const snap = await tx.get(intentRef);
    if (!snap.exists) return { ok: false as const, reason: "missing_intent" };
    const data = snap.data() || {};
    if (String(data.status || "") === "paid") return { ok: false as const, reason: "already_paid" };
    const orderId = String(data.orderId || "");
    if (!orderId) return { ok: false as const, reason: "missing_order" };
    const orderRef = db.collection(COLLECTIONS.orders).doc(orderId);
    const orderSnap = await tx.get(orderRef);
    if (orderSnap.exists && String(orderSnap.data()?.paymentStatus || "") === "paid") {
      return { ok: false as const, reason: "order_already_paid" };
    }
    tx.set(
      intentRef,
      {
        status: "cancelled",
        adminReviewRequired: false,
        abandonConfirmedAtMs: Date.now(),
        resultStatus: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    if (orderSnap.exists && String(orderSnap.data()?.status || "") !== "cancelled") {
      tx.set(
        orderRef,
        {
          status: "cancelled",
          cancelReason: "hyp_payment_abandoned_after_review",
          cancelledAt: Timestamp.now(),
          cancelledBy: "admin:hyp_reconcile",
        },
        { merge: true }
      );
    }
    return { ok: true as const, orderId, couponStatus: String(data.couponStatus || "") };
  });

  if (!gate.ok) return gate;

  // Coupon restore is idempotent (held|redeemed → restored once).
  await restoreCouponForCancelledOrder(gate.orderId);
  return { ok: true as const, orderId: gate.orderId };
}

/** @deprecated Use flagHypIntentForAdminReview — auto-expire must not cancel paid-uncertain intents. */
export async function expireUnpaidHypIntentAndRestoreCoupon(requestId: string) {
  return flagHypIntentForAdminReview(requestId);
}

export async function loadHypResultSession(token: string): Promise<HypResultSessionView | null> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length < 16) return null;
  const hash = hashHypResultToken(trimmed);
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.hypPaymentIntents)
    .where("resultTokenHash", "==", hash)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const data = doc.data() || {};
  // Defense in depth if query were ever wrong.
  if (!hypResultTokensMatch(String(data.resultTokenHash || ""), trimmed)) return null;

  const status = (data.resultStatus as HypUiPaymentStatus) || "pending";
  if (status === "paid" && String(data.status || "") !== "paid") {
    return { status: "pending", code: "STATUS_PENDING_CONFIRM" };
  }
  return {
    status,
    orderLabel: status === "paid" ? publicOrderLabel(String(data.orderNumber || "")) : undefined,
    code: typeof data.lastBrowserOutcomeCode === "string" ? data.lastBrowserOutcomeCode : undefined,
  };
}
