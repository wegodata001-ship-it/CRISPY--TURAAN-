import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendCriticalCheckoutFailureEmail } from "@/lib/email/send";
import { fingerprintCritical } from "@/lib/email/significant-diff";
import type { NotifyResult } from "@/lib/email/notifications/new-order";

const COLLECTION = "email_alert_dedupe";
const RATE_LIMIT_MS = 15 * 60 * 1000;

/**
 * Critical checkout failure alert with fingerprint rate-limit.
 * Never blocks checkout — caller must fire-and-forget.
 */
export async function notifyCriticalOrderFailure(input: {
  message: string;
  code?: string;
}): Promise<NotifyResult> {
  const message = input.message?.trim();
  if (!message) return { status: "skipped", reason: "empty_message" };

  // Ignore noisy client/validation style messages
  const lower = message.toLowerCase();
  if (
    lower.includes("validation") ||
    lower.includes("required") ||
    lower.includes("invalid input") ||
    input.code === "VALIDATION"
  ) {
    return { status: "skipped", reason: "non_critical" };
  }

  const fingerprint = fingerprintCritical({ message, code: input.code });
  const ref = getAdminDb().collection(COLLECTION).doc(`critical_${fingerprint}`);

  try {
    const snap = await ref.get();
    if (snap.exists) {
      const last = snap.data()?.lastSentAt;
      const lastMs =
        last && typeof last.toMillis === "function" ? last.toMillis() : 0;
      if (Date.now() - lastMs < RATE_LIMIT_MS) {
        return { status: "already_sent" };
      }
    }

    await ref.set(
      {
        status: "SENDING",
        fingerprint,
        lastAttemptAt: FieldValue.serverTimestamp(),
        attempts: FieldValue.increment(1),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("[email] Email notification failed", {
      kind: "critical",
      stage: "claim",
      error: error instanceof Error ? error.message : "claim failed",
    });
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Failed to claim",
    };
  }

  const result = await sendCriticalCheckoutFailureEmail({
    message,
    code: input.code,
    occurredAt: new Date().toISOString(),
  });

  if (!result.ok) {
    await ref
      .set(
        {
          status: "FAILED",
          lastError: result.error.slice(0, 300),
          failedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .catch(() => undefined);
    return { status: "failed", error: result.error };
  }

  await ref
    .set(
      {
        status: "SENT",
        messageId: result.messageId ?? null,
        lastSentAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    .catch(() => undefined);

  return { status: "sent", messageId: result.messageId };
}
