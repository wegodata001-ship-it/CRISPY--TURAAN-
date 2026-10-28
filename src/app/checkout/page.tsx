"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Phone,
  User,
  MessageSquare,
  Store,
  CheckCircle2,
  Banknote,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { CouponEntry } from "@/features/cart/coupon-entry";
import { PhoneOtpDialog } from "@/features/checkout/phone-otp-dialog";
import { getOrCreateGuestCustomer, GUEST_CUSTOMER_ID } from "@/services";
import { parseIsraeliMobile } from "@/lib/phone-otp/engine";
import { requestNewOrderEmailNotification, requestCriticalCheckoutFailureNotification } from "@/lib/email/client-notify";
import { formatPrice } from "@/lib/utils";
import { calculateLineTotal } from "@/lib/product-builder/engine";

async function checkoutWithCoupon(input: {
  requestId: string;
  phoneProof: string;
  couponCode: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  locale: "ar" | "he" | "en";
  paymentMethod: string;
  items: import("@/types").CartItem[];
}) {
  const response = await fetch("/api/coupons/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestId: input.requestId,
      phoneProof: input.phoneProof,
      couponCode: input.couponCode,
      customerId: GUEST_CUSTOMER_ID,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      notes: input.notes,
      locale: input.locale,
      paymentMethod: input.paymentMethod,
      paymentStatus: "pending",
      items: input.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        notes: item.notes?.trim() || undefined,
        selections: item.selections.map((selection) => ({
          groupId: selection.groupId,
          optionId: selection.optionId,
          quantity: selection.quantity,
        })),
      })),
    }),
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    message?: string;
    code?: string;
    orderId?: string;
    orderNumber?: string;
    printQueued?: boolean;
  } | null;
  if (!response.ok || !payload?.ok || !payload.orderId || !payload.orderNumber || !payload.printQueued) {
    return {
      success: false as const,
      error: payload?.message || "الكوبون غير صالح",
      code: payload?.code,
    };
  }
  return {
    success: true as const,
    data: { id: payload.orderId, orderNumber: payload.orderNumber },
    printQueued: true as const,
  };
}

async function placeVerifiedCheckout(input: {
  requestId: string;
  phoneProof: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  locale: "ar" | "he" | "en";
  paymentMethod: string;
  items: import("@/types").CartItem[];
}) {
  const response = await fetch("/api/orders/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestId: input.requestId,
      phoneProof: input.phoneProof,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      notes: input.notes,
      locale: input.locale,
      paymentMethod: input.paymentMethod,
      items: input.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        notes: item.notes?.trim() || undefined,
        selections: item.selections.map((selection) => ({
          groupId: selection.groupId,
          optionId: selection.optionId,
          quantity: selection.quantity,
        })),
      })),
    }),
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    message?: string;
    code?: string;
    orderId?: string;
    orderNumber?: string;
    printQueued?: boolean;
  } | null;
  if (!response.ok || !payload?.ok || !payload.orderId || !payload.orderNumber || !payload.printQueued) {
    return { success: false as const, error: payload?.message || "يجب تأكيد رقم الهاتف قبل إرسال الطلب", code: payload?.code };
  }
  return { success: true as const, data: { id: payload.orderId, orderNumber: payload.orderNumber }, printQueued: true as const };
}

function OrderLineItem({ item }: { item: import("@/types").CartItem }) {
  const localized = useLocalizedProduct(item.product);
  return (
    <div className="space-y-0.5 text-sm">
      <div className="flex justify-between">
        <span className="text-coffee/70">
          {item.quantity}× {localized.name}
        </span>
        <span>{formatPrice(calculateLineTotal(item.unitPrice, item.quantity))}</span>
      </div>
      {item.selections.map((s) => (
        <p key={`${s.groupId}-${s.optionId}`} className="ps-3 text-xs text-coffee/45">
          + {s.optionName}
        </p>
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const {
    items, subtotal, discount, total, coupon,
    clearCart,
  } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [phoneProof, setPhoneProof] = useState<{ proofId: string; phone: string; maskedPhone: string } | null>(null);
  const orderRequestId = useRef("");
  const [placedOrderNumber, setPlacedOrderNumber] = useState("");

  if (items.length === 0 && !success) {
    return (
      <>
        <Header searchQuery="" onSearchChange={() => {}} />
        <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
          <AppLogo size="lg" href="/" className="h-16 w-auto" />
          <h1 className="mt-6 font-display text-2xl font-bold text-dark-brown">
            {t("cart.empty")}
          </h1>
          <p className="mt-2 text-sm text-coffee-light">{t("cart.emptyHint")}</p>
          <Button asChild variant="turquoise" size="lg" className="mt-6 h-12 rounded-full px-8">
            <Link href="/">{t("cart.continueShopping")}</Link>
          </Button>
        </div>
      </>
    );
  }

  const checkoutLocale = locale === "he" || locale === "en" ? locale : "ar";
  const phoneMatchesProof = Boolean(phoneProof && parseIsraeliMobile(phone)?.local === phoneProof.phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError(t("validation.required")); return; }
    if (!parseIsraeliMobile(phone)) {
      setError(checkoutLocale === "he" ? "יש להזין מספר ישראלי בפורמט 05XXXXXXXX" : checkoutLocale === "en" ? "Enter an Israeli mobile number as 05XXXXXXXX" : "أدخل رقم هاتف إسرائيلي بصيغة 05XXXXXXXX");
      return;
    }
    if (!phoneMatchesProof || !phoneProof) {
      setOtpOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      void getOrCreateGuestCustomer();
      if (!orderRequestId.current) {
        orderRequestId.current = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `order-${Date.now()}`;
      }
      const orderNotes = [
        notes.trim(),
        t("checkout.pickupFromStore", "איסוף עצמי מהעסק"),
      ].filter(Boolean).join("\n");
      const result = coupon
        ? await checkoutWithCoupon({
            requestId: orderRequestId.current,
            phoneProof: phoneProof.proofId,
            couponCode: coupon.code,
            customerName: name,
            customerPhone: phoneProof.phone,
            notes: orderNotes || undefined,
            locale: checkoutLocale,
            paymentMethod: payment,
            items,
          })
        : await placeVerifiedCheckout({
            requestId: orderRequestId.current,
            phoneProof: phoneProof.proofId,
            customerName: name,
            customerPhone: phoneProof.phone,
            notes: orderNotes || undefined,
            locale: checkoutLocale,
            paymentMethod: payment,
            items,
          });
      if (!result.success) {
        console.error("[checkout] order failed:", result.error, result.code);
        setError(result.error || t("checkout.orderSaveError"));
        return;
      }

      requestNewOrderEmailNotification(result.data.id);
      setPlacedOrderNumber(result.data.orderNumber);
      setSuccess(true);
      clearCart();
      setTimeout(() => router.push("/orders"), 2800);
    } catch (err) {
      console.error("[checkout] unexpected error:", err);
      requestCriticalCheckoutFailureNotification({
        message: err instanceof Error ? err.message : "Unexpected checkout failure",
        code: "CHECKOUT_UNEXPECTED",
      });
      setError(t("checkout.orderSaveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header searchQuery="" onSearchChange={() => {}} />
      <div className="mx-auto max-w-[720px] px-4 py-6 md:px-6">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center rounded-[18px] border border-beige-dark bg-warm-white px-6 py-16 text-center shadow-soft"
            >
              <AppLogo size="lg" href={null} className="h-16 w-auto" />
              <div className="mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#2E9B55]/15 text-[#2E9B55]">
                <CheckCircle2 className="h-10 w-10" strokeWidth={1.75} />
              </div>
              <h2 className="mt-6 font-display text-2xl font-bold text-dark-brown">
                {t("checkout.success")} 🎉
              </h2>
              {placedOrderNumber && (
                <p className="mt-3 text-sm font-bold text-turquoise">
                  {t("orders.orderNumber", "מספר הזמנה")}: #{placedOrderNumber}
                </p>
              )}
              <p className="mt-2 text-sm text-coffee-light">{t("checkout.queueHint", "تم حفظ الطلب وإرساله إلى طابور الطباعة.")}</p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="space-y-4 pb-8"
            >
              <h1 className="font-display text-2xl font-bold text-dark-brown">{t("checkout.title")}</h1>

              <section className="rounded-[18px] border border-beige-dark bg-warm-white p-4 shadow-soft">
                <h2 className="text-sm font-bold">{t("checkout.stepDetails")}</h2>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("checkout.name")}
                    </Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-12" required />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("checkout.phone")}
                    </Label>
                    <Input value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneProof(null); }} type="tel" inputMode="tel" placeholder="05XXXXXXXX" className="mt-1 h-12" dir="ltr" required />
                    {phoneMatchesProof && phoneProof ? (
                      <p className="mt-2 text-sm font-semibold text-[#2E9B55]" dir="ltr">{phoneProof.maskedPhone}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("checkout.notes")}
                    </Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder={t("builder.notesPlaceholder")} />
                  </div>
                </div>
              </section>

              <section className="rounded-[18px] border border-beige-dark bg-warm-white p-4 shadow-soft">
                <h2 className="text-sm font-bold">{t("checkout.pickup")}</h2>
                <div className="mt-3 flex items-center gap-3 rounded-xl border-2 border-turquoise bg-turquoise/5 px-4 py-3">
                  <Store className="h-5 w-5 text-turquoise" strokeWidth={1.75} />
                  <span className="font-semibold">{t("checkout.pickupFromStore")}</span>
                </div>
              </section>

              <section className="rounded-[18px] border border-beige-dark bg-warm-white p-4 shadow-soft">
                <h2 className="text-sm font-bold">{t("checkout.payment")}</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(["cash", "card"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayment(method)}
                      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 p-3 font-medium ${
                        payment === method ? "border-turquoise bg-turquoise/5" : "border-beige-dark"
                      }`}
                    >
                      {method === "cash" ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                      {method === "cash" ? t("checkout.paymentCash") : t("checkout.paymentCard")}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[18px] border border-beige-dark bg-warm-white p-4 shadow-soft">
                <h2 className="text-sm font-bold">{t("cart.summary")}</h2>
                <div className="mt-3 space-y-2">
                  {items.map((item) => (
                    <OrderLineItem key={item.lineId} item={item} />
                  ))}
                </div>
                <div className="mt-4">
                  <CouponEntry />
                </div>
                <div className="mt-4 space-y-1.5 border-t border-beige-dark/20 pt-3 text-sm">
                  <div className="flex justify-between text-coffee-light">
                    <span>{t("cart.subtotal")}</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-turquoise">
                      <span>{t("cart.discount")}</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex items-end justify-between pt-2">
                    <span className="font-bold">{t("checkout.totalToPay")}</span>
                    <span className="text-2xl font-bold tabular-nums">{formatPrice(total)}</span>
                  </div>
                </div>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <Button type="submit" variant="turquoise" size="lg" className="mt-4 h-14 w-full rounded-2xl text-base font-bold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : phoneMatchesProof ? `${t("checkout.confirmOrder", "تأكيد الطلب")} • ${formatPrice(total)}` : t("checkout.sendOtp", "إرسال رمز التحقق")}
                </Button>
              </section>
            </motion.form>
          )}
        </AnimatePresence>
        <PhoneOtpDialog
          open={otpOpen}
          phone={phone}
          locale={checkoutLocale}
          onClose={() => setOtpOpen(false)}
          onVerified={(proof) => {
            const parsed = parseIsraeliMobile(phone);
            if (!parsed) return;
            setPhoneProof({ proofId: proof.proofId, phone: parsed.local, maskedPhone: proof.maskedPhone });
            setOtpOpen(false);
            setError(null);
          }}
        />
      </div>
    </>
  );
}
