import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { confirmKitchenPrint } from "@/lib/orders/place-verified-order";
import { claimPhoneProof, phoneVerificationRef, proofStateFrom } from "@/lib/phone-otp/server";
import { parseIsraeliMobile } from "@/lib/phone-otp/engine";
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
  phoneProof: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
  locale?: "ar" | "he" | "en";
  paymentMethod?: string;
  paymentStatus?: string;
  items: CheckoutItem[];
}) {
  const db = getAdminDb();
  const settings = await db.collection(COLLECTIONS.settings).doc("app").get();
  if (settings.exists && settings.data()?.orderingPaused === true) {
    return { ok: false as const, code: "ORDERING_PAUSED" as const };
  }
  const code = normalizeCouponCode(input.couponCode);
  const requestId = input.requestId.trim();
  const proofId = input.phoneProof.trim();
  const phone = parseIsraeliMobile(input.customerPhone || "");
  if (!requestId || !code || !proofId || !phone || input.items.length === 0) {
    return { ok: false as const, code: !proofId || !phone ? ("PHONE_NOT_VERIFIED" as const) : ("INVALID" as const) };
  }

  const result = await db.runTransaction(async (tx) => {
    const requestRef = db.collection(COLLECTIONS.couponCheckoutRequests).doc(requestId);
    const couponRef = coupons().doc(code);
    const proofRef = phoneVerificationRef(proofId);
    const customerKey = customerCouponKey(phone.local, input.customerId);
    const useRef = db.collection(COLLECTIONS.couponCustomerUses).doc(`${code}_${customerKey}`);
    const requestSnap = await tx.get(requestRef);
    if (requestSnap.exists) {
      return {
        ok: true as const,
        replayed: true,
        orderId: String(requestSnap.data()?.orderId || ""),
        orderNumber: String(requestSnap.data()?.orderNumber || ""),
        total: Number(requestSnap.data()?.total) || 0,
        discountAmount: Number(requestSnap.data()?.discountAmount) || 0,
        subtotal: Number(requestSnap.data()?.subtotal) || 0,
      };
    }
    const proofSnap = await tx.get(proofRef);
    const couponSnap = await tx.get(couponRef);
    const useSnap = await tx.get(useRef);
    const proof = claimPhoneProof({
      proof: proofStateFrom(proofSnap.data()),
      phone: phone.local,
      requestId,
    });
    if (!proof.ok) return proof;
    if (proof.alreadyUsedByRequest) return { ok: false as const, code: "PHONE_NOT_VERIFIED" as const };
    const verifiedPhone = proofStateFrom(proofSnap.data())?.phoneLocal || phone.local;
    const coupon = couponSnap.exists ? asCoupon(couponSnap.id, couponSnap.data() || {}) : null;
    const decision = evaluateCoupon({
      coupon,
      subtotal: itemsSubtotal(input.items),
      now: new Date(),
      alreadyUsedByCustomer: useSnap.exists,
    });
    if (!decision.ok) return decision;

    const orderRef = db.collection(COLLECTIONS.orders).doc();
    const redemptionRef = db.collection(COLLECTIONS.couponRedemptions).doc(`${code}_${orderRef.id}`);
    const quote = decision.quote;
    const orderNumber = `MC-${new Date().getFullYear()}-${orderRef.id.slice(0, 8).toUpperCase()}`;
    const order = {
      orderNumber,
      customerId: input.customerId,
      customerName: input.customerName.trim(),
      customerPhone: verifiedPhone,
      phoneVerified: true,
      phoneVerifiedAt: Timestamp.now(),
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
    };
    tx.set(orderRef, order);
    tx.update(proofRef, {
      used: true,
      usedByRequestId: requestId,
      orderId: orderRef.id,
      usedAt: FieldValue.serverTimestamp(),
    });
    tx.set(redemptionRef, {
      couponId: code,
      couponCode: code,
      orderId: orderRef.id,
      orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone || "",
      originalAmount: quote.subtotal,
      discountAmount: quote.discountAmount,
      finalAmount: quote.total,
      redeemedAt: Timestamp.now(),
      status: "redeemed",
      orderStatus: "received",
      requestId,
    });
    tx.update(couponRef, {
      usedCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (coupon?.onePerCustomer) {
      tx.set(useRef, { couponId: code, customerKey, orderId: orderRef.id, redeemedAt: Timestamp.now() });
    }
    tx.set(requestRef, {
      orderId: orderRef.id,
      orderNumber,
      total: quote.total,
      discountAmount: quote.discountAmount,
      subtotal: quote.subtotal,
      couponCode: code,
    });
    return {
      ok: true as const,
      replayed: false,
      orderId: orderRef.id,
      orderNumber,
      total: quote.total,
      discountAmount: quote.discountAmount,
      subtotal: quote.subtotal,
    };
  });

  if (!result.ok) return result;
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
  return { ...result, printQueued: true as const };
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
    if (!redemption.exists || redemption.data()?.status !== "redeemed") return false;
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
