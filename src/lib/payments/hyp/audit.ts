import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export type HypPaymentAuditAction =
  | "confirm_redirect"
  | "flag_for_review"
  | "abandon_after_review"
  | "result_session_issued"
  | "kitchen_print_claimed"
  | "kitchen_print_released"
  | "kitchen_print_retry_cleared";

export async function writeHypPaymentAudit(input: {
  action: HypPaymentAuditAction;
  actorUid: string;
  actorRole: string;
  actorEmail?: string;
  requestId?: string;
  orderId?: string;
  ok: boolean;
  code?: string;
  detail?: Record<string, string | number | boolean | null>;
}) {
  const db = getAdminDb();
  await db.collection(COLLECTIONS.hypPaymentAuditLogs).add({
    action: input.action,
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    actorEmail: input.actorEmail || null,
    requestId: input.requestId || null,
    orderId: input.orderId || null,
    ok: input.ok,
    code: input.code || null,
    detail: input.detail || null,
    createdAt: FieldValue.serverTimestamp(),
  });
}
