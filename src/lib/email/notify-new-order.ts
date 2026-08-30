import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getPortalAdminOrderUrl } from "@/lib/email/config";
import { sendNewOrderNotificationEmail } from "@/lib/email/send";
import type { SendEmailResult } from "@/lib/email/types";
import type { FirestoreOrder } from "@/types/firestore";

export type NotifyNewOrderResult =
  | { status: "sent"; messageId?: string }
  | { status: "already_sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

type OrderWithNotifications = FirestoreOrder & {
  notifications?: {
    newOrderEmailSent?: boolean;
    newOrderEmailSentAt?: unknown;
  };
};

function timestampToIso(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

/**
 * Claim + send new-order email exactly once per order.
 * Email failures never throw — callers must not fail the order.
 */
export async function notifyNewOrderEmail(orderId: string): Promise<NotifyNewOrderResult> {
  if (!orderId.trim()) {
    return { status: "skipped", reason: "missing orderId" };
  }

  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.orders).doc(orderId);

  let claimedOrder: OrderWithNotifications | null = null;

  try {
    const claim = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        return { ok: false as const, reason: "order_not_found" as const };
      }
      const data = snap.data() as OrderWithNotifications;
      if (data.notifications?.newOrderEmailSent) {
        return { ok: false as const, reason: "already_sent" as const };
      }
      tx.update(ref, {
        "notifications.newOrderEmailSent": true,
        "notifications.newOrderEmailSentAt": FieldValue.serverTimestamp(),
        "notifications.newOrderEmailProvider": "BREVO",
      });
      return { ok: true as const, data };
    });

    if (!claim.ok) {
      if (claim.reason === "already_sent") return { status: "already_sent" };
      return { status: "skipped", reason: claim.reason };
    }

    claimedOrder = claim.data;
  } catch (error) {
    console.error("[email] Email notification failed", {
      kind: "new_order",
      stage: "claim",
      orderId,
      error: error instanceof Error ? error.message : "claim failed",
    });
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Failed to claim email send",
    };
  }

  const data = claimedOrder;
  const result: SendEmailResult = await sendNewOrderNotificationEmail({
    orderId,
    orderNumber: data.orderNumber,
    createdAt: timestampToIso(data.createdAt),
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    items: (data.items ?? []).map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      modifiers: item.modifiers?.map((m) => ({
        optionName: m.optionName,
        quantity: m.quantity,
      })),
      notes: item.notes,
      kitchenNotes: item.kitchenNotes,
    })),
    total: data.total,
    paymentMethod: data.paymentMethod,
    orderType: data.orderType,
    notes: data.notes,
    viewUrl: getPortalAdminOrderUrl(orderId),
  });

  if (!result.ok) {
    try {
      await ref.update({
        "notifications.newOrderEmailSent": false,
        "notifications.newOrderEmailLastError": result.error.slice(0, 300),
        "notifications.newOrderEmailFailedAt": FieldValue.serverTimestamp(),
      });
    } catch (releaseError) {
      console.error("[email] Email notification failed", {
        kind: "new_order",
        stage: "release_claim",
        orderId,
        error:
          releaseError instanceof Error ? releaseError.message : "release failed",
      });
    }
    return { status: "failed", error: result.error };
  }

  return { status: "sent", messageId: result.messageId };
}
