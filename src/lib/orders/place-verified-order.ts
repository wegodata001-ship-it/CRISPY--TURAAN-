import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { maybeEnqueueNewOrderPrint } from "@/lib/print-jobs/enqueue-new-order";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { priceCheckoutItems, type CheckoutLineInput } from "@/lib/orders/trusted-cart";
import { claimPhoneProof, phoneVerificationRef, proofStateFrom } from "@/lib/phone-otp/server";
import { parseIsraeliMobile } from "@/lib/phone-otp/engine";

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
  phoneProof: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  locale?: "ar" | "he" | "en";
  paymentMethod?: string;
  items: CheckoutLineInput[];
}) {
  const db = getAdminDb();
  const settings = await db.collection(COLLECTIONS.settings).doc("app").get();
  if (settings.exists && settings.data()?.orderingPaused === true) {
    return { ok: false as const, code: "ORDERING_PAUSED" as const };
  }
  const requestId = input.requestId.trim();
  const proofId = input.phoneProof.trim();
  const phone = parseIsraeliMobile(input.customerPhone);
  if (!requestId || !proofId || !phone || !input.customerName.trim()) {
    return { ok: false as const, code: "PHONE_NOT_VERIFIED" as const };
  }
  const locale = input.locale === "he" || input.locale === "en" ? input.locale : "ar";
  const priced = await priceCheckoutItems(input.items, locale);
  if (!priced.ok) return priced;
  const result = await db.runTransaction(async (tx) => {
    const requestRef = db.collection(COLLECTIONS.orderCheckoutRequests).doc(requestId);
    const proofRef = phoneVerificationRef(proofId);
    const requestSnap = await tx.get(requestRef);
    const proofSnap = await tx.get(proofRef);
    if (requestSnap.exists) {
      return {
        ok: true as const,
        replayed: true,
        orderId: String(requestSnap.data()?.orderId || ""),
        orderNumber: String(requestSnap.data()?.orderNumber || ""),
        total: Number(requestSnap.data()?.total) || 0,
      };
    }
    const proof = claimPhoneProof({
      proof: proofStateFrom(proofSnap.data()),
      phone: phone.local,
      requestId,
    });
    if (!proof.ok) return proof;
    if (proof.alreadyUsedByRequest) return { ok: false as const, code: "PHONE_NOT_VERIFIED" as const };
    const verified = proofStateFrom(proofSnap.data());
    const orderRef = db.collection(COLLECTIONS.orders).doc();
    const orderNumber = generateOrderNumber();
    const total = Math.max(priced.subtotal, 0.01);
    tx.set(orderRef, {
      orderNumber,
      customerId: input.customerId,
      customerName: input.customerName.trim(),
      customerPhone: verified?.phoneLocal || phone.local,
      phoneVerified: true,
      phoneVerifiedAt: Timestamp.now(),
      items: priced.items,
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
    });
    tx.update(proofRef, {
      used: true,
      usedByRequestId: requestId,
      orderId: orderRef.id,
      usedAt: FieldValue.serverTimestamp(),
    });
    tx.set(requestRef, { orderId: orderRef.id, orderNumber, total });
    return { ok: true as const, replayed: false, orderId: orderRef.id, orderNumber, total };
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
