import { NextRequest, NextResponse } from "next/server";
import { isHypPaymentsEnabled } from "@/lib/payments/hyp";
import { isHypStagingMockEnabled } from "@/lib/payments/hyp/staging-mock";
import {
  confirmHypReturnAndReleaseKitchen,
  recordHypBrowserOutcome,
} from "@/lib/payments/hyp/server-confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resultRedirect(request: NextRequest, token?: string) {
  const dest = new URL("/checkout/payment-result", request.nextUrl.origin);
  if (token) dest.searchParams.set("token", token);
  return NextResponse.redirect(dest);
}

/**
 * Hyp Pay return endpoint.
 * Browser redirect is untrusted — only server VERIFY can mark paid.
 * Success UI requires an opaque server-issued token (not status=paid in the URL).
 */
export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.search.startsWith("?")
    ? request.nextUrl.search.slice(1)
    : request.nextUrl.search;
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  if (!isHypPaymentsEnabled() && !isHypStagingMockEnabled()) {
    if (wantsJson) {
      return NextResponse.json(
        { ok: false, code: "HYP_DISABLED", message: "Hyp Pay confirmation is disabled in this environment" },
        { status: 503 }
      );
    }
    return resultRedirect(request);
  }

  if (!rawQuery) {
    if (wantsJson) {
      return NextResponse.json(
        { ok: false, code: "MISSING_PARAMS", message: "Missing Hyp redirect parameters" },
        { status: 400 }
      );
    }
    return resultRedirect(request);
  }

  const params = new URLSearchParams(rawQuery);
  const cCode = params.get("CCode");
  const orderRef = params.get("Order");

  if (cCode && cCode !== "0") {
    const uiStatus = cCode === "900" || cCode === "901" ? "cancelled" : "failed";
    const recorded = await recordHypBrowserOutcome({
      orderRef,
      status: uiStatus,
      code: "PAYMENT_DECLINED",
    });
    if (wantsJson) {
      return NextResponse.json({
        ok: false,
        code: "PAYMENT_DECLINED",
        cCode,
        status: uiStatus,
        resultToken: recorded.resultToken || undefined,
      });
    }
    return resultRedirect(request, recorded.resultToken || undefined);
  }

  try {
    const result = await confirmHypReturnAndReleaseKitchen(rawQuery);
    if (!result.ok) {
      const inconclusive = "inconclusive" in result && result.inconclusive === true;
      if (inconclusive) {
        const recorded = await recordHypBrowserOutcome({
          orderRef: result.intent?.orderRef || orderRef,
          status: "pending",
          code: result.code,
        });
        if (wantsJson) {
          return NextResponse.json(
            { ...result, resultToken: recorded.resultToken || undefined },
            { status: 503 }
          );
        }
        return resultRedirect(request, recorded.resultToken || undefined);
      }

      const uiStatus =
        result.code === "PAYMENT_DECLINED"
          ? "failed"
          : result.code === "INTENT_TERMINAL"
            ? "failed"
            : "failed";
      const recorded = await recordHypBrowserOutcome({
        orderRef: result.intent?.orderRef || orderRef,
        status: uiStatus === "failed" ? "failed" : "pending",
        code: result.code,
      });
      if (wantsJson) {
        return NextResponse.json(
          { ...result, resultToken: recorded.resultToken || undefined },
          { status: 409 }
        );
      }
      return resultRedirect(request, recorded.resultToken || undefined);
    }

    if (wantsJson) {
      return NextResponse.json({
        ok: true,
        alreadyPaid: result.alreadyPaid,
        transactionId: result.transactionId,
        printQueued: result.printQueued,
        resultToken: result.resultToken,
      });
    }
    return resultRedirect(request, result.resultToken || undefined);
  } catch {
    const recorded = await recordHypBrowserOutcome({
      orderRef,
      status: "pending",
      code: "CONFIRM_FAILED",
    });
    if (wantsJson) {
      return NextResponse.json(
        {
          ok: false,
          code: "CONFIRM_FAILED",
          inconclusive: true,
          resultToken: recorded.resultToken || undefined,
        },
        { status: 500 }
      );
    }
    return resultRedirect(request, recorded.resultToken || undefined);
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let rawQuery = "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    rawQuery = await request.text();
  } else {
    const body = (await request.json().catch(() => null)) as { query?: string } | null;
    rawQuery = body?.query || "";
  }
  const url = request.nextUrl.clone();
  url.search = rawQuery ? `?${rawQuery.replace(/^\?/, "")}` : "";
  return GET(new NextRequest(url, { method: "GET", headers: request.headers }));
}
