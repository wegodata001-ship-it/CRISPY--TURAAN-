import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { enqueueNewOrderPrintJob } from "@/lib/print-jobs/jobs";
import { isAutoPrintNewOrdersEnabled } from "@/lib/print-jobs/config";
import type { EnqueueResult } from "@/lib/print-jobs/jobs";

/**
 * After an order document exists, queue a NEW_ORDER print job.
 * Gated by PRINT_AUTO_NEW_ORDERS (default off). Unique on orderId+NEW_ORDER.
 * Does not change payment or order status.
 */
export async function maybeEnqueueNewOrderPrint(orderId: string): Promise<EnqueueResult> {
  try {
    if (!isAutoPrintNewOrdersEnabled()) {
      return { status: "skipped", reason: "auto_print_disabled" };
    }
    const snap = await getAdminDb().collection(COLLECTIONS.orders).doc(orderId).get();
    if (!snap.exists) return { status: "skipped", reason: "order_not_found" };
    return await enqueueNewOrderPrintJob(orderId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "enqueue_failed";
    console.error("[PrintJob] enqueue failed", { orderId, error: message });
    throw error;
  }
}
