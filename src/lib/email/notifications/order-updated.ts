import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  claimNotification,
  markNotificationFailed,
  markNotificationSent,
} from "@/lib/email/notification-state";
import { firestoreOrderToEmailPayload } from "@/lib/email/order-email-payload";
import { sendOrderUpdatedNotificationEmail } from "@/lib/email/send";
import type { OrderChange } from "@/lib/email/significant-diff";
import type { NotifyResult } from "@/lib/email/notifications/new-order";
import type { FirestoreOrder } from "@/types/firestore";

const FIELD = "orderUpdatedEmail";

export async function notifyOrderUpdated(input: {
  orderId: string;
  changes: OrderChange[];
  fingerprint: string;
}): Promise<NotifyResult> {
  const { orderId, changes, fingerprint } = input;
  if (!orderId.trim()) return { status: "skipped", reason: "missing orderId" };
  if (!changes.length) return { status: "skipped", reason: "no_significant_changes" };

  const ref = getAdminDb().collection(COLLECTIONS.orders).doc(orderId);

  let data: FirestoreOrder;
  try {
    const snap = await ref.get();
    if (!snap.exists) return { status: "skipped", reason: "order_not_found" };
    data = snap.data() as FirestoreOrder;

    const claim = await claimNotification(ref, FIELD, {
      fingerprint,
      allowRetryFailed: true,
    });
    if (!claim.ok) {
      if (claim.reason === "already_sent") return { status: "already_sent" };
      return { status: "in_progress" };
    }
  } catch (error) {
    console.error("[email] Email notification failed", {
      kind: "order_updated",
      stage: "claim",
      orderId,
      error: error instanceof Error ? error.message : "claim failed",
    });
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Failed to claim",
    };
  }

  const result = await sendOrderUpdatedNotificationEmail({
    ...firestoreOrderToEmailPayload(orderId, data),
    changes,
  });

  if (!result.ok) {
    await markNotificationFailed(ref, FIELD, {
      error: result.error,
      fingerprint,
    }).catch(() => undefined);
    return { status: "failed", error: result.error };
  }

  await markNotificationSent(ref, FIELD, {
    messageId: result.messageId,
    fingerprint,
  }).catch(() => undefined);

  return { status: "sent", messageId: result.messageId };
}
