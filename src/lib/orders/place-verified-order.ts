import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { maybeEnqueueNewOrderPrint } from "@/lib/print-jobs/enqueue-new-order";
import { generateOrderNumber } from "@/lib/orders/order-number";
import {
  priceCheckoutItems,
  pricedLinesForFirestore,
  type CheckoutLineInput,
} from "@/lib/orders/trusted-cart";
import { parseIsraeliMobile } from "@/lib/phone/israeli-mobile";
import {
  buildHypOrderRef,
  issueHypPaymentUrlForOrder,
  loadHypPayConfig,
  resolveCheckoutSettlementModeFromEnv,
} from "@/lib/payments/hyp";
import {
  isHypStagingMockEnabled,
  STAGING_HYP_MOCK_MASOF,
} from "@/lib/payments/hyp/staging-mock";

export async function confirmKitchenPrint(orderId: string) {
  try {
    const result = await maybeEnqueueNewOrderPrint(orderId);
    const queued = result.status === "created" || result.status === "already_exists";
    return {
      queued,
      status: result.status,
      reason: result.status === "skipped" ? result.reason : undefined,
    };
  } catch (error) {
    console.error("[PrintJob] enqueue failed", {
      orderId,
      error: error instanceof Error ? error.message : "enqueue_failed",
    });
    return { queued: false, status: "failed" as const, reason: "enqueue_failed" };
  }
}

export async function placeVerifiedOrder(input: {
  requestId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  locale?: "ar" | "he" | "en";
  paymentMethod?: string;
  items: CheckoutLineInput[];
}) {
  const settlement = resolveCheckoutSettlementModeFromEnv(input.paymentMethod);
  if (settlement.kind === "hyp_flag_incomplete_config") {
    return { ok: false as const, code: "HYP_NOT_CONFIGURED" as const };
  }

  const db = getAdminDb();
  const settings = await db.collection(COLLECTIONS.settings).doc("app").get();
  if (settings.exists && settings.data()?.orderingPaused === true) {
    return { ok: false as const, code: "ORDERING_PAUSED" as const };
  }
  const requestId = input.requestId.trim();
  const phone = parseIsraeliMobile(input.customerPhone);
  if (!requestId || !phone || !input.customerName.trim()) {
    return { ok: false as const, code: "INVALID_PHONE" as const };
  }
  const locale = input.locale === "he" || input.locale === "en" ? input.locale : "ar";
  const priced = await priceCheckoutItems(input.items, locale);
  if (!priced.ok) return priced;
  const awaitingHypPayment = settlement.kind === "hyp_card_awaiting_payment";
  const total = Math.max(priced.subtotal, 0.01);
  const requestRef = db.collection(COLLECTIONS.orderCheckoutRequests).doc(requestId);

  // Idempotent replay before any Hyp network call.
  const existingRequest = await requestRef.get();
  if (existingRequest.exists) {
    const data = existingRequest.data() || {};
    const orderId = String(data.orderId || "");
    const orderNumber = String(data.orderNumber || "");
    const replayTotal = Number(data.total) || total;
    if (data.awaitingPayment === true && typeof data.paymentUrl === "string" && data.paymentUrl) {
      return {
        ok: true as const,
        replayed: true as const,
        orderId,
        orderNumber,
        total: replayTotal,
        paymentUrl: data.paymentUrl,
        printQueued: false as const,
        awaitingPayment: true as const,
      };
    }
    if (data.awaitingPayment !== true) {
      const print = await confirmKitchenPrint(orderId);
      if (!print.queued) {
        return {
          ok: false as const,
          code: "PRINT_NOT_QUEUED" as const,
          orderSaved: true as const,
          orderId,
          orderNumber,
        };
      }
      return {
        ok: true as const,
        replayed: true as const,
        orderId,
        orderNumber,
        total: replayTotal,
        printQueued: true as const,
        awaitingPayment: false as const,
      };
    }
  }

  const hypConfig = loadHypPayConfig();
  const stagingMock = isHypStagingMockEnabled();
  const hypOrderRefValue = buildHypOrderRef(requestId);
  const expectedMasof = stagingMock ? STAGING_HYP_MOCK_MASOF : hypConfig.masof;

  // Persist unpaid order + durable intent BEFORE issuing any Hyp payment URL.
  const result = await db.runTransaction(async (tx) => {
    const requestSnap = await tx.get(requestRef);
    if (requestSnap.exists) {
      const data = requestSnap.data() || {};
      return {
        ok: true as const,
        replayed: true as const,
        orderId: String(data.orderId || ""),
        orderNumber: String(data.orderNumber || ""),
        total: Number(data.total) || 0,
        awaitingPayment: data.awaitingPayment === true,
        paymentUrl: typeof data.paymentUrl === "string" ? data.paymentUrl : undefined,
      };
    }
    const orderDoc = db.collection(COLLECTIONS.orders).doc();
    const orderNumber = generateOrderNumber();
    tx.set(orderDoc, {
      orderNumber,
      customerId: input.customerId,
      customerName: input.customerName.trim(),
      customerPhone: phone.local,
      phoneVerified: false,
      items: pricedLinesForFirestore(priced.items),
      status: "received",
      subtotal: priced.subtotal,
      discount: 0,
      delivery: 0,
      total,
      paymentMethod: input.paymentMethod || "cash",
      paymentStatus: "pending",
      orderType: "pickup",
      notes: input.notes?.trim() || "",
      locale,
      createdAt: Timestamp.now(),
      ...(awaitingHypPayment
        ? {
            awaitingHypPayment: true,
            requiresOnlinePayment: true,
            paymentFlow: "hyp_online",
            hypOrderRef: hypOrderRefValue || null,
          }
        : {}),
    });
    tx.set(requestRef, {
      orderId: orderDoc.id,
      orderNumber,
      total,
      awaitingPayment: awaitingHypPayment,
    });
    if (awaitingHypPayment) {
      if (!hypOrderRefValue) return { ok: false as const, code: "HYP_PAYMENT_LINK_FAILED" as const };
      tx.set(db.collection(COLLECTIONS.hypPaymentIntents).doc(requestId), {
        requestId,
        orderId: orderDoc.id,
        orderNumber,
        orderRef: hypOrderRefValue,
        amount: total,
        currencyCoin: hypConfig.coin || 1,
        expectedMasof,
        status: "created",
        couponStatus: "none",
        kitchenPrintReleased: false,
        stagingMock,
        createdAtMs: Date.now(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return {
      ok: true as const,
      replayed: false as const,
      orderId: orderDoc.id,
      orderNumber,
      total,
      awaitingPayment: awaitingHypPayment,
    };
  });
  if (!result.ok) return result;

  if (awaitingHypPayment || result.awaitingPayment) {
    if (result.paymentUrl) {
      return {
        ok: true as const,
        replayed: result.replayed,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        total: result.total,
        paymentUrl: result.paymentUrl,
        printQueued: false as const,
        awaitingPayment: true as const,
      };
    }

    const issued = await issueHypPaymentUrlForOrder({
      requestId,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      amount: result.total,
      customerName: input.customerName,
      cell: phone.local,
    });
    if (!issued.ok) {
      if ("diagnostic" in issued && issued.diagnostic) {
        console.error("[checkout] Hyp payment link failed", {
          code: issued.code,
          httpStatus: issued.diagnostic.httpStatus,
          cCode: issued.diagnostic.cCode,
          bodyKind: issued.diagnostic.bodyKind,
          hasActionPay: issued.diagnostic.hasActionPay,
          hasSignature: issued.diagnostic.hasSignature,
        });
      } else {
        console.error("[checkout] Hyp payment link failed", { code: issued.code });
      }
      await db.collection(COLLECTIONS.orders).doc(result.orderId).set(
        {
          status: "cancelled",
          cancelReason: "hyp_payment_link_failed",
          cancelledAt: Timestamp.now(),
          cancelledBy: "system:hyp_checkout",
        },
        { merge: true }
      );
      await db.collection(COLLECTIONS.hypPaymentIntents).doc(requestId).set(
        { status: "failed", updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return { ok: false as const, code: "HYP_PAYMENT_LINK_FAILED" as const };
    }

    await db.runTransaction(async (tx) => {
      tx.set(
        db.collection(COLLECTIONS.hypPaymentIntents).doc(requestId),
        {
          paymentUrl: issued.paymentUrl,
          orderRef: issued.orderRef,
          status: "redirected",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      tx.set(
        requestRef,
        {
          paymentUrl: issued.paymentUrl,
          hypOrderRef: issued.orderRef,
          awaitingPayment: true,
        },
        { merge: true }
      );
    });

    return {
      ok: true as const,
      replayed: result.replayed,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      total: result.total,
      paymentUrl: issued.paymentUrl,
      printQueued: false as const,
      awaitingPayment: true as const,
    };
  }

  const print = await confirmKitchenPrint(result.orderId);
  if (!print.queued) {
    return {
      ok: false as const,
      code: "PRINT_NOT_QUEUED" as const,
      orderSaved: true as const,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
    };
  }
  return { ...result, printQueued: true as const, awaitingPayment: false as const };
}
