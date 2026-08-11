"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, Phone, User, MessageSquare, Store, Truck, CheckCircle2, Banknote, CreditCard } from "lucide-react";
import { Header } from "@/components/layout/header";
import { CheckoutProgress } from "@/components/checkout/checkout-progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { createOrderFromCart, getOrCreateGuestCustomer, GUEST_CUSTOMER_ID } from "@/services";
import { formatPrice } from "@/lib/utils";
import { calculateLineTotal } from "@/lib/product-builder/engine";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@/types";

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
  const router = useRouter();
  const {
    items, subtotal, discount, deliveryFee, total,
    orderType, setOrderType, clearCart, couponCode,
  } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (items.length === 0 && !success) {
    return (
      <>
        <Header searchQuery="" onSearchChange={() => {}} />
        <div className="mx-auto max-w-lg px-4 py-12">
          <EmptyState
            icon={ShoppingBag}
            title={t("cart.empty")}
            description={t("cart.emptyHint")}
            actionLabel={t("cart.continueShopping")}
            actionHref="/"
          />
        </div>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) { setError(t("validation.required")); return; }
    if (orderType === "delivery" && !address) { setError(t("validation.required")); return; }

    setLoading(true);
    setError(null);
    try {
      void getOrCreateGuestCustomer();

      const orderNotes = [
        notes.trim(),
        phone.trim() ? `${t("checkout.phone")}: ${phone.trim()}` : "",
        orderType === "delivery" && address.trim()
          ? `${t("checkout.address")}: ${address.trim()}`
          : "",
        orderType === "pickup" ? t("checkout.pickup") : t("checkout.delivery"),
      ]
        .filter(Boolean)
        .join("\n");

      const result = await createOrderFromCart(items, GUEST_CUSTOMER_ID, name, {
        subtotal,
        discount,
        delivery: deliveryFee,
        total,
        paymentMethod: payment,
        notes: orderNotes || undefined,
      });
      if (!result.success) {
        console.error("[checkout] order failed:", result.error, result.code);
        setError(t("checkout.orderSaveError"));
        return;
      }

      setSuccess(true);
      clearCart();
      setTimeout(() => router.push("/orders"), 2800);
    } catch (err) {
      console.error("[checkout] unexpected error:", err);
      setError(t("checkout.orderSaveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header searchQuery="" onSearchChange={() => {}} />
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <CheckoutProgress current={success ? "confirm" : "details"} />

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center rounded-3xl bg-warm-white px-6 py-16 text-center shadow-soft"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-turquoise/15 text-turquoise">
                <CheckCircle2 className="h-10 w-10" strokeWidth={1.75} />
              </div>
              <h2 className="mt-6 font-display text-2xl font-bold text-dark-brown">{t("checkout.success")}</h2>
              <p className="mt-2 text-sm text-coffee/60">{t("checkout.successHint")}</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-display text-3xl font-bold text-dark-brown">{t("checkout.title")}</h1>

              <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-5">
                <div className="space-y-6 lg:col-span-3">
                  <div className="rounded-2xl bg-warm-white p-5 shadow-soft">
                    <h2 className="text-sm font-semibold">{t("checkout.orderType")}</h2>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {(["pickup", "delivery"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setOrderType(type)}
                          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
                            orderType === type ? "border-turquoise bg-turquoise/5" : "border-beige-dark/30"
                          }`}
                        >
                          {type === "pickup" ? <Store className="h-5 w-5" strokeWidth={1.75} /> : <Truck className="h-5 w-5" strokeWidth={1.75} />}
                          <span className="font-medium">
                            {type === "pickup" ? t("checkout.pickup") : t("checkout.delivery")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-warm-white p-5 shadow-soft">
                    <h2 className="text-sm font-semibold">{t("checkout.details")}</h2>
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("checkout.name")}</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("checkout.phone")}</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="mt-1" required />
                      </div>
                      {orderType === "delivery" && (
                        <div>
                          <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("checkout.address")}</Label>
                          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
                        </div>
                      )}
                      <div>
                        <Label className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("checkout.notes")}</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder={t("checkout.notes")} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-warm-white p-5 shadow-soft">
                    <h2 className="text-sm font-semibold">{t("checkout.payment")}</h2>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {(["cash", "card"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPayment(method)}
                          className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
                            payment === method ? "border-turquoise bg-turquoise/5" : "border-beige-dark/30"
                          }`}
                        >
                          {method === "cash" ? <Banknote className="h-5 w-5" strokeWidth={1.75} /> : <CreditCard className="h-5 w-5" strokeWidth={1.75} />}
                          <span className="font-medium">
                            {method === "cash" ? t("checkout.paymentCash") : t("checkout.paymentCard")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="sticky top-24 rounded-2xl bg-warm-white p-5 shadow-soft">
                    <h2 className="text-sm font-semibold">{t("checkout.orderSummary")}</h2>
                    <div className="mt-4 space-y-2">
                      {items.map((item) => (
                        <OrderLineItem key={item.lineId} item={item} />
                      ))}
                    </div>
                    <div className="mt-4 space-y-1.5 border-t border-beige-dark/20 pt-4 text-sm">
                      <div className="flex justify-between"><span>{t("cart.subtotal")}</span><span>{formatPrice(subtotal)}</span></div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>{t("cart.discount")} ({couponCode})</span>
                          <span>-{formatPrice(discount)}</span>
                        </div>
                      )}
                      {deliveryFee > 0 && (
                        <div className="flex justify-between"><span>{t("cart.delivery")}</span><span>{formatPrice(deliveryFee)}</span></div>
                      )}
                      <div className="flex justify-between pt-2 text-lg font-bold">
                        <span>{t("cart.total")}</span>
                        <span className="text-turquoise">{formatPrice(total)}</span>
                      </div>
                    </div>
                    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                    <Button type="submit" variant="turquoise" size="lg" className="mt-4 w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("checkout.placeOrder")}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
