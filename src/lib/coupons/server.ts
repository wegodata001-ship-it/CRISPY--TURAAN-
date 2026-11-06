import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { confirmKitchenPrint } from "@/lib/orders/place-verified-order";
import { parseIsraeliMobile } from "@/lib/phone/israeli-mobile";
import {
  buildHypOrderRef,
  couponRedemptionStatusForCheckout,
  issueHypPaymentUrlForOrder,
  loadHypPayConfig,
  resolveCheckoutSettlementModeFromEnv,
} from "@/lib/payments/hyp";
import {
  isHypStagingMockEnabled,
  STAGING_HYP_MOCK_MASOF,
} from "@/lib/payments/hyp/staging-mock";
import {
  customerCouponKey,
  evaluateCoupon,
  itemsSubtotal,
  missingStarterCodes,
  normalizeCouponCode,
  starterCouponDraft,
  type CouponDiscountType,
  type CouponErrorCode,
  type CouponSnapshot,
} from "@/lib/coupons/engine";

export type CouponWriteInput = {
  code?: string;
  campaignName?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions: number | null;
  onePerCustomer?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  minOrderAmount?: number | null;
  active?: boolean;
};

function coupons() {
  return getAdminDb().collection(COLLECTIONS.coupons);
}

function asCoupon(id: string, data: FirebaseFirestore.DocumentData): CouponSnapshot & {
  campaignName: string;
  createdAt: string | null;
  updatedAt: string | null;
} {
  return {
    code: normalizeCouponCode(String(data.code || id)),
    campaignName: String(data.campaignName || ""),
    discountType: data.discountType === "fixed" ? "fixed" : "percent",
    discountValue: Number(data.discountValue) || 0,
    maxRedemptions:
      data.maxRedemptions == null || data.maxRedemptions === ""
        ? null
        : Number(data.maxRedemptions),
    usedCount: Number(data.usedCount) || 0,
    active: data.active !== false,
    startsAt: data.startsAt ? String(data.startsAt) : null,
    expiresAt: data.expiresAt ? String(data.expiresAt) : null,
    minOrderAmount: data.minOrderAmount == null ? null : Number(data.minOrderAmount),
    onePerCustomer: data.onePerCustomer === true,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? (data.createdAt ? String(data.createdAt) : null),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? (data.updatedAt ? String(data.updatedAt) : null),
  };
}

export async function redeemedDiscountTotal() {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.couponRedemptions)
    .where("status", "==", "redeemed")
    .get();
  return snap.docs.reduce((sum, doc) => sum + (Number(doc.data().discountAmount) || 0), 0);
}

export async function listCoupons() {
  await ensureStarterCoupons();
  const snap = await coupons().get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...asCoupon(doc.id, doc.data()) }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function ensureStarterCoupons() {
  const db = getAdminDb();
  const nowIso = new Date().toISOString();
  const existing = await coupons().get();
  const missing = missingStarterCodes(existing.docs.map((doc) => doc.id));
  if (missing.length === 0) return { created: [] as string[] };
  const batch = db.batch();
  for (const code of missing) {
    const draft = starterCouponDraft(code, nowIso);
    batch.create(coupons().doc(code), {
      ...draft,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return { created: missing };
}

export async function createCoupon(input: CouponWriteInput) {
  const code = normalizeCouponCode(input.code || "");
  if (!code) throw new Error("CODE_REQUIRED");
  const nowIso = new Date().toISOString();
  const ref = coupons().doc(code);
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) throw new Error("CODE_EXISTS");
    tx.set(ref, {
      code,
      campaignName: input.campaignName?.trim() || code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxRedemptions: input.maxRedemptions,
      usedCount: 0,
      active: input.active !== false,
      startsAt: input.startsAt || nowIso,
      expiresAt: input.expiresAt || null,
      minOrderAmount: input.minOrderAmount ?? null,
      onePerCustomer: input.onePerCustomer === true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return code;
}

export async function createCouponBatch(input: CouponWriteInput & { count: number; prefix: string }) {
  const created: string[] = [];
  const skipped: string[] = [];
  const prefix = normalizeCouponCode(input.prefix || "CRISPY");
  for (let i = 1; i <= input.count; i += 1) {
    const code = `${prefix}-${String(i).padStart(2, "0")}`;
    try {
      await createCoupon({ ...input, code });
      created.push(code);
    } catch (error) {
      if (error instanceof Error && error.message === "CODE_EXISTS") skipped.push(code);
      else throw error;
    }
  }
  return { created, skipped };
}

export async function updateCoupon(id: string, patch: Partial<CouponWriteInput>) {
  const ref = coupons().doc(normalizeCouponCode(id));
  const allowed: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (patch.campaignName != null) allowed.campaignName = patch.campaignName.trim();
  if (patch.discountType) allowed.discountType = patch.discountType;
  if (patch.discountValue != null) allowed.discountValue = patch.discountValue;
  if (patch.maxRedemptions !== undefined) allowed.maxRedemptions = patch.maxRedemptions;
  if (patch.onePerCustomer != null) allowed.onePerCustomer = patch.onePerCustomer;
  if (patch.startsAt !== undefined) allowed.startsAt = patch.startsAt;
  if (patch.expiresAt !== undefined) allowed.expiresAt = patch.expiresAt;
  if (patch.minOrderAmount !== undefined) allowed.minOrderAmount = patch.minOrderAmount;
  if (patch.active != null) allowed.active = patch.active;
  await ref.update(allowed);
}

export async function listRedemptions(couponId: string) {
  const code = normalizeCouponCode(couponId);
  const snap = await getAdminDb()
    .collection(COLLECTIONS.couponRedemptions)
    .where("couponId", "==", code)
    .get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        couponId: code,
        couponCode: String(data.couponCode || code),
        orderId: String(data.orderId || ""),
        orderNumber: String(data.orderNumber || ""),
        customerName: String(data.customerName || ""),
        customerPhone: String(data.customerPhone || ""),
        originalAmount: Number(data.originalAmount) || 0,
        discountAmount: Number(data.discountAmount) || 0,
        finalAmount: Number(data.finalAmount) || 0,
        redeemedAt: data.redeemedAt?.toDate?.()?.toISOString?.() ?? String(data.redeemedAt || ""),
        status: String(data.status || "redeemed"),
        orderStatus: String(data.orderStatus || "received"),
      };
    })
    .sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt));
}

type CheckoutItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  basePrice?: number;
  notes?: string;
  kitchenNotes?: string[];
  modifiers?: unknown[];
};

export async function checkoutWithCoupon(input: {
  requestId: string;
  couponCode: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
  locale?: "ar" | "he" | "en";
  paymentMethod?: string;
  paymentStatus?: string;
  items: CheckoutItem[];
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
  const code = normalizeCouponCode(input.couponCode);
  const requestId = input.requestId.trim();
  const phone = parseIsraeliMobile(input.customerPhone || "");
  if (!requestId || !code || !phone || !input.customerName.trim() || input.items.length === 0) {
    return { ok: false as const, code: !phone ? ("INVALID_PHONE" as const) : ("INVALID" as const) };
  }

  const awaitingHypPayment = settlement.kind === "hyp_card_awaiting_payment";
  const redemptionStatus = couponRedemptionStatusForCheckout(settlement);
  const requestRef = db.collection(COLLECTIONS.couponCheckoutRequests).doc(requestId);
  const subtotal = itemsSubtotal(input.items);

  // Soft-validate coupon before any Hyp call / persistence.
  {
    const couponSnap = await coupons().doc(code).get();
    const customerKey = customerCouponKey(phone.local, input.customerId);
    const useSnap = await db.collection(COLLECTIONS.couponCustomerUses).doc(`${code}_${customerKey}`).get();
    const coupon = couponSnap.exists ? asCoupon(couponSnap.id, couponSnap.data() || {}) : null;
    const decision = evaluateCoupon({
      coupon,
      subtotal,
      now: new Date(),
      alreadyUsedByCustomer: useSnap.exists,
    });
    if (!decision.ok) return decision;
  }

  const existingRequest = await requestRef.get();
  if (existingRequest.exists) {
    const data = existingRequest.data() || {};
    const orderId = String(data.orderId || "");
    const orderNumber = String(data.orderNumber || "");
    const replay = {
      ok: true as const,
      replayed: true as const,
      orderId,
      orderNumber,
      total: Number(data.total) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      subtotal: Number(data.subtotal) || 0,
    };
    if (data.awaitingPayment === true && typeof data.paymentUrl === "string" && data.paymentUrl) {
      return {
        ...replay,
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
      return { ...replay, printQueued: true as const, awaitingPayment: false as const };
    }
  }

  const hypConfig = loadHypPayConfig();
  const stagingMock = isHypStagingMockEnabled();
  const hypOrderRefValue = buildHypOrderRef(requestId);
  const expectedMasof = stagingMock ? STAGING_HYP_MOCK_MASOF : hypConfig.masof;

  // Persist order + held coupon + durable intent BEFORE issuing a payment URL.
  const result = await db.runTransaction(async (tx) => {
    const couponRef = coupons().doc(code);
    const customerKey = customerCouponKey(phone.local, input.customerId);
    const useRef = db.collection(COLLECTIONS.couponCustomerUses).doc(`${code}_${customerKey}`);
    const requestSnap = await tx.get(requestRef);
    if (requestSnap.exists) {
      const data = requestSnap.data() || {};
      return {
        ok: true as const,
        replayed: true as const,
        orderId: String(data.orderId || ""),
        orderNumber: String(data.orderNumber || ""),
        total: Number(data.total) || 0,
        discountAmount: Number(data.discountAmount) || 0,
        subtotal: Number(data.subtotal) || 0,
        awaitingPayment: data.awaitingPayment === true,
        paymentUrl: typeof data.paymentUrl === "string" ? data.paymentUrl : undefined,
      };
    }
    const couponSnap = await tx.get(couponRef);
    const useSnap = await tx.get(useRef);
    const coupon = couponSnap.exists ? asCoupon(couponSnap.id, couponSnap.data() || {}) : null;
    const decision = evaluateCoupon({
      coupon,
      subtotal,
      now: new Date(),
      alreadyUsedByCustomer: useSnap.exists,
    });
    if (!decision.ok) return decision;

    const orderDoc = db.collection(COLLECTIONS.orders).doc();
    const redemptionRef = db.collection(COLLECTIONS.couponRedemptions).doc(`${code}_${orderDoc.id}`);
    const quote = decision.quote;
    const orderNumber = `MC-${new Date().getFullYear()}-${orderDoc.id.slice(0, 8).toUpperCase()}`;
    const order = {
      orderNumber,
      customerId: input.customerId,
      customerName: input.customerName.trim(),
      customerPhone: phone.local,
      phoneVerified: false,
      items: input.items,
      status: "received",
      subtotal: quote.subtotal,
      discount: quote.discountAmount,
      delivery: 0,
      total: quote.total,
      paymentMethod: input.paymentMethod || "cash",
      paymentStatus: input.paymentStatus || "pending",
      orderType: "pickup",
      notes: input.notes?.trim() || "",
      locale: input.locale || null,
      couponCode: code,
      couponDiscountType: quote.discountType,
      couponDiscountValue: quote.discountValue,
      createdAt: Timestamp.now(),
      ...(awaitingHypPayment
        ? {
            awaitingHypPayment: true,
            requiresOnlinePayment: true,
            paymentFlow: "hyp_online",
            hypOrderRef: hypOrderRefValue || null,
          }
        : {}),
    };
    tx.set(orderDoc, order);
    tx.set(redemptionRef, {
      couponId: code,
      couponCode: code,
      orderId: orderDoc.id,
      orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone || "",
      originalAmount: quote.subtotal,
      discountAmount: quote.discountAmount,
      finalAmount: quote.total,
      redeemedAt: Timestamp.now(),
      status: redemptionStatus,
      orderStatus: "received",
      requestId,
    });
    tx.update(couponRef, {
      usedCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (coupon?.onePerCustomer) {
      tx.set(useRef, { couponId: code, customerKey, orderId: orderDoc.id, redeemedAt: Timestamp.now() });
    }
    tx.set(requestRef, {
      orderId: orderDoc.id,
      orderNumber,
      total: quote.total,
      discountAmount: quote.discountAmount,
      subtotal: quote.subtotal,
      couponCode: code,
      awaitingPayment: awaitingHypPayment,
    });
    if (awaitingHypPayment) {
      if (!hypOrderRefValue) return { ok: false as const, code: "HYP_PAYMENT_LINK_FAILED" as const };
      tx.set(db.collection(COLLECTIONS.hypPaymentIntents).doc(requestId), {
        requestId,
        orderId: orderDoc.id,
        orderNumber,
        orderRef: hypOrderRefValue,
        amount: quote.total,
        currencyCoin: hypConfig.coin || 1,
        expectedMasof,
        couponCode: code,
        couponStatus: "held",
        status: "created",
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
      total: quote.total,
      discountAmount: quote.discountAmount,
      subtotal: quote.subtotal,
      awaitingPayment: awaitingHypPayment,
    };
  });

  if (!result.ok) return result;

  if (awaitingHypPayment || result.awaitingPayment) {
    if (result.paymentUrl) {
      return {
        ...result,
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
      couponCode: code,
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
      await restoreCouponForCancelledOrder(result.orderId);
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
      ...result,
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

export async function restoreCouponForCancelledOrder(orderId: string) {
  const db = getAdminDb();
  const orderRef = db.collection(COLLECTIONS.orders).doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return { restored: false, reason: "missing_order" };
  const order = orderSnap.data() || {};
  if (order.status !== "cancelled") return { restored: false, reason: "not_cancelled" };
  const code = normalizeCouponCode(String(order.couponCode || ""));
  if (!code) return { restored: false, reason: "no_coupon" };
  const redemptionRef = db.collection(COLLECTIONS.couponRedemptions).doc(`${code}_${orderId}`);
  const restored = await db.runTransaction(async (tx) => {
    const redemption = await tx.get(redemptionRef);
    const couponRef = coupons().doc(code);
    const coupon = await tx.get(couponRef);
    const redemptionStatus = String(redemption.data()?.status || "");
    // held = reserved for unpaid Hyp card checkout; redeemed = legacy / paid path
    if (!redemption.exists || (redemptionStatus !== "redeemed" && redemptionStatus !== "held")) {
      return false;
    }
    const customerKey = customerCouponKey(
      typeof order.customerPhone === "string" ? order.customerPhone : undefined,
      typeof order.customerId === "string" ? order.customerId : undefined
    );
    const useRef = db.collection(COLLECTIONS.couponCustomerUses).doc(`${code}_${customerKey}`);
    tx.update(redemptionRef, { status: "restored", orderStatus: "cancelled" });
    if (coupon.exists && Number(coupon.data()?.usedCount) > 0) {
      tx.update(couponRef, {
        usedCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.delete(useRef);
    return true;
  });
  return { restored };
}

export function isCouponError(code: string): code is CouponErrorCode {
  return [
    "INVALID",
    "INACTIVE",
    "NOT_STARTED",
    "EXPIRED",
    "USED_UP",
    "MIN_AMOUNT",
    "ALREADY_USED_BY_CUSTOMER",
  ].includes(code);
}
