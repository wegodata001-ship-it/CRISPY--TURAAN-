"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/brand/app-logo";

type UiStatus = "paid" | "failed" | "cancelled" | "pending";

type SessionPayload = {
  ok?: boolean;
  status?: UiStatus;
  orderLabel?: string;
  code?: string;
};

function copyFor(status: UiStatus) {
  if (status === "paid") {
    return {
      title: "تم تأكيد الدفع",
      hint: "تم التحقق من الدفع على الخادم. سيُرسل الطلب للمطبخ عند اكتمال التأكيد.",
      cta: "عرض الطلبات",
      href: "/orders",
    };
  }
  if (status === "cancelled") {
    return {
      title: "تم إلغاء الدفع",
      hint: "لم يُؤكَّد أي دفع. لم يُرسل الطلب للمطبخ. يبقى الكوبون محجوزًا حتى مراجعة آمنة أو محاولة دفع ناجحة.",
      cta: "العودة للقائمة",
      href: "/",
    };
  }
  if (status === "failed") {
    return {
      title: "تعذر تأكيد الدفع",
      hint: "التحقق من الخادم لم ينجح. لم نعتبر العملية مدفوعة ولم نرسلها للمطبخ.",
      cta: "العودة للقائمة",
      href: "/",
    };
  }
  return {
    title: "جاري التحقق من الدفع",
    hint:
      "لا يمكن عرض نجاح الدفع من الرابط وحده. إذا أغلقت المتصفح أو انقطع الاتصال، قد يكون الدفع قد تم لدى HYP — تبقى العملية معلّقة للمراجعة دون اعتبارها فاشلة تلقائيًا.",
    cta: "العودة للقائمة",
    href: "/",
  };
}

function PaymentResultBody() {
  const params = useSearchParams();
  // Intentionally ignore forged ?status=paid — only server token is trusted.
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(Boolean(token));
  const [session, setSession] = useState<SessionPayload>({ status: "pending" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setSession({ status: "pending", code: "MISSING_TOKEN" });
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/payments/hyp/result?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as SessionPayload | null;
        if (!cancelled) {
          setSession({
            status: json?.status === "paid" || json?.status === "failed" || json?.status === "cancelled"
              ? json.status
              : "pending",
            orderLabel: typeof json?.orderLabel === "string" ? json.orderLabel : undefined,
            code: typeof json?.code === "string" ? json.code : undefined,
          });
        }
      } catch {
        if (!cancelled) setSession({ status: "pending", code: "LOOKUP_FAILED" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const status = session.status || "pending";
  const copy = copyFor(status);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <AppLogo size="lg" href="/" className="h-16 w-auto" />
      <h1 className="mt-6 font-display text-2xl font-bold text-dark-brown">
        {loading ? "جاري التحقق…" : copy.title}
      </h1>
      {status === "paid" && session.orderLabel ? (
        <p className="mt-2 text-sm text-coffee/70">{session.orderLabel}</p>
      ) : null}
      <p className="mt-3 text-sm text-coffee-light">{loading ? "نتحقق من نتيجة موثوقة من الخادم." : copy.hint}</p>
      {status === "pending" && session.code ? (
        <p className="mt-2 text-xs text-coffee/45">رمز المتابعة: {session.code}</p>
      ) : null}
      {status !== "paid" ? (
        <p className="mt-4 text-xs text-coffee/50">
          تغيير status في الرابط لا يعرض نجاح الدفع. يلزم رمز جلسة صادر من الخادم بعد VERIFY.
        </p>
      ) : null}
      <Button asChild variant="turquoise" size="lg" className="mt-8 h-12 rounded-full px-8">
        <Link href={copy.href}>{copy.cta}</Link>
      </Button>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <>
      <Header searchQuery="" onSearchChange={() => {}} />
      <Suspense fallback={<div className="p-10 text-center text-sm text-coffee/60">…</div>}>
        <PaymentResultBody />
      </Suspense>
    </>
  );
}
