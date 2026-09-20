import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { timestampToIso } from "@/lib/email/order-email-payload";
import { parsePrintLocale } from "@/lib/print-jobs/ids";
import {
  buildReceiptModelFromFirestoreOrder,
} from "@/lib/print-jobs/receipt-model";
import { buildTestReceiptModel } from "@/lib/print-jobs/test-receipt";
import type { PrintJob, PrintLocale, ReceiptModel } from "@/lib/print-jobs/types";
import type { FirestoreOrder } from "@/types/firestore";

export async function loadReceiptForJob(
  job: PrintJob,
  localeOverride?: PrintLocale
): Promise<ReceiptModel> {
  const locale = localeOverride ?? job.locale;

  if (job.type === "TEST" || !job.orderId) {
    return buildTestReceiptModel(locale);
  }

  const snap = await getAdminDb().collection(COLLECTIONS.orders).doc(job.orderId).get();
  if (!snap.exists) {
    throw new Error("order_not_found");
  }
  const data = snap.data() as FirestoreOrder;
  return buildReceiptModelFromFirestoreOrder(
    data,
    timestampToIso(data.createdAt),
    locale ?? parsePrintLocale(data.locale)
  );
}
