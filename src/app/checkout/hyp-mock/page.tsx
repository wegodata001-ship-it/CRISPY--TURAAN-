"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

/** Keep in sync with server `staging-mock.ts` — do not import server module into the client. */
const STAGING_HYP_MOCK_MASOF = "STAGING_MOCK";
const STAGING_HYP_MOCK_TX_PREFIX = "MOCK-TX-";

/**
 * Local staging-only fake Hyp hosted page.
 * This is NOT a real Hyp Pay checkout and never contacts pay.hyp.co.il.
 */
function HypMockCheckoutInner() {
  const params = useSearchParams();
  const orderRef = (params.get("Order") || "").trim();
  const amount = (params.get("Amount") || "").trim();

  const returnBase = useMemo(() => {
    if (typeof window === "undefined") return "/api/payments/hyp/return";
    return `${window.location.origin}/api/payments/hyp/return`;
  }, []);

  const buildReturnUrl = (cCode: string) => {
    const url = new URL(returnBase, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    url.searchParams.set("CCode", cCode);
    url.searchParams.set("Order", orderRef || "missing");
    url.searchParams.set("Amount", amount || "0");
    url.searchParams.set("Masof", STAGING_HYP_MOCK_MASOF);
    url.searchParams.set("Id", `${STAGING_HYP_MOCK_TX_PREFIX}${Date.now()}`);
    url.searchParams.set("mock", "1");
    return url.toString();
  };

  if (!orderRef) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-2xl font-bold text-[#A90F16]">محاكاة HYP غير صالحة</h1>
        <p className="text-sm text-[#70665D]">Missing Order reference. Return to checkout and try again.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-5 px-6 py-16">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">محاكاة Staging — ليست عملية دفع HYP حقيقية</p>
        <p className="mt-1">
          Staging mock only. No money is charged. No request is sent to Hyp / pay.hyp.co.il.
        </p>
      </div>

      <h1 className="text-2xl font-bold text-[#171717]">صفحة دفع تجريبية</h1>
      <dl className="space-y-2 rounded-2xl border border-[#E7D7C3] bg-[#FFF8F0] p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[#70665D]">Order</dt>
          <dd className="font-mono text-[#171717]" dir="ltr">
            {orderRef}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#70665D]">Amount</dt>
          <dd className="font-semibold text-[#171717]" dir="ltr">
            {amount || "—"} ILS
          </dd>
        </div>
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={buildReturnUrl("0")}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2E9B55] px-4 text-center text-sm font-bold text-white hover:bg-[#247A43]"
        >
          محاكاة نجاح الدفع
        </a>
        <a
          href={buildReturnUrl("900")}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-[#D71920] px-4 text-center text-sm font-bold text-white hover:bg-[#A90F16]"
        >
          محاكاة فشل / إلغاء
        </a>
      </div>
    </main>
  );
}

export default function HypMockCheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center px-6">
          <p className="text-sm text-[#70665D]">Loading mock payment…</p>
        </main>
      }
    >
      <HypMockCheckoutInner />
    </Suspense>
  );
}
