import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/verify-admin";
import {
  canAbandonHypPayment,
  canConfirmHypPayments,
  canFlagHypPaymentReview,
} from "@/lib/auth/roles";
import {
  buildHypRecoveryPlan,
  hypPaySupportsDocumentedPaymentPageWebhook,
  hypPaySupportsDocumentedTransactionInquiry,
  isHypPaymentsEnabled,
} from "@/lib/payments/hyp";
import { writeHypPaymentAudit } from "@/lib/payments/hyp/audit";
import {
  abandonUnpaidHypIntentAfterReview,
  confirmHypReturnAndReleaseKitchen,
  flagHypIntentForAdminReview,
} from "@/lib/payments/hyp/server-confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Staff reconciliation for pending Hyp payments.
 * Hyp Pay hosted pages have no documented IPN — staff uses VERIFY / review queue.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canConfirmHypPayments(auth.role) && !canFlagHypPaymentReview(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const plan = buildHypRecoveryPlan();
  return NextResponse.json({
    ok: true,
    hypEnabled: isHypPaymentsEnabled(),
    documentedPaymentPageWebhook: hypPaySupportsDocumentedPaymentPageWebhook(),
    documentedTransactionInquiry: hypPaySupportsDocumentedTransactionInquiry(),
    recovery: plan,
    permissions: {
      confirmRedirect: canConfirmHypPayments(auth.role),
      flagForReview: canFlagHypPaymentReview(auth.role),
      abandonAfterReview: canAbandonHypPayment(auth.role),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isHypPaymentsEnabled()) {
    return NextResponse.json(
      { ok: false, code: "HYP_DISABLED", message: "Hyp Pay is disabled" },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    action?: "confirm_redirect" | "flag_for_review" | "abandon_after_review" | "expire_intent";
    rawQuery?: string;
    requestId?: string;
  } | null;

  if (
    (body?.action === "flag_for_review" || body?.action === "expire_intent") &&
    body.requestId
  ) {
    if (!canFlagHypPaymentReview(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await flagHypIntentForAdminReview(body.requestId.trim());
    await writeHypPaymentAudit({
      action: "flag_for_review",
      actorUid: auth.uid,
      actorRole: auth.role,
      actorEmail: auth.email,
      requestId: body.requestId.trim(),
      orderId: result.ok ? result.orderId : undefined,
      ok: result.ok,
      code: result.ok ? undefined : result.reason,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  }

  if (body?.action === "abandon_after_review" && body.requestId) {
    if (!canAbandonHypPayment(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await abandonUnpaidHypIntentAfterReview(body.requestId.trim());
    await writeHypPaymentAudit({
      action: "abandon_after_review",
      actorUid: auth.uid,
      actorRole: auth.role,
      actorEmail: auth.email,
      requestId: body.requestId.trim(),
      orderId: result.ok ? result.orderId : undefined,
      ok: result.ok,
      code: result.ok ? undefined : result.reason,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  }

  if (body?.action === "confirm_redirect" && body.rawQuery) {
    if (!canConfirmHypPayments(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await confirmHypReturnAndReleaseKitchen(body.rawQuery.replace(/^\?/, ""));
    await writeHypPaymentAudit({
      action: "confirm_redirect",
      actorUid: auth.uid,
      actorRole: auth.role,
      actorEmail: auth.email,
      requestId: result.ok ? undefined : result.intent?.requestId,
      orderId: result.ok ? result.orderId : result.intent?.orderId,
      ok: result.ok,
      code: result.ok ? undefined : result.code,
      detail: result.ok
        ? { alreadyPaid: result.alreadyPaid, printQueued: result.printQueued }
        : undefined,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  }

  return NextResponse.json(
    {
      ok: false,
      code: "INVALID",
      message: "action required: confirm_redirect | flag_for_review | abandon_after_review",
    },
    { status: 400 }
  );
}
