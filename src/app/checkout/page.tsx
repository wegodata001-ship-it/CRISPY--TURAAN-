"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, MapPin, Phone, User, MessageSquare, Store, Truck } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/features/cart/cart-context";
import { createOrderFromCart, getOrCreateGuestCustomer } from "@/services";
import { formatPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items, subtotal, discount, deliveryFee, total,
    orderType, setOrderType, clearCart, couponCode,
  } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <>
        <Header searchQuery="" onSearchChange={() => {}} />
        <div className="flex flex-col items-center py-20">
          <p className="text-coffee/60">Your cart is empty</p>
          <Button className="mt-4" onClick={() => router.push("/")}>Browse Menu</Button>
        </div>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) { setError("Name and phone are required"); return; }
    if (orderType === "delivery" && !address) { setError("Address required for delivery"); return; }

    setLoading(true);
    setError(null);
    try {
      const guest = await getOrCreateGuestCustomer();
      if (!guest.success) { setError(guest.error); return; }

      const result = await createOrderFromCart(items, guest.data.id, name);
      if (!result.success) { setError(result.error); return; }

      clearCart();
      router.push("/orders");
    } catch {
      setError("Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header searchQuery="" onSearchChange={() => {}} />
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-bold text-dark-brown dark:text-warm-white">
          Checkout
        </motion.h1>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl bg-warm-white p-5 shadow-soft dark:bg-[#1a1412]">
              <h2 className="text-sm font-semibold">Order Type</h2>
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
                    {type === "pickup" ? <Store className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                    <span className="font-medium capitalize">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-warm-white p-5 shadow-soft dark:bg-[#1a1412]">
              <h2 className="text-sm font-semibold">Your Details</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="mt-1" required />
                </div>
                {orderType === "delivery" && (
                  <div>
                    <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Address</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
                  </div>
                )}
                <div>
                  <Label className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Special requests..." />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl bg-warm-white p-5 shadow-soft dark:bg-[#1a1412]">
              <h2 className="text-sm font-semibold">Order Summary</h2>
              <div className="mt-4 space-y-2">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-coffee/70">{item.quantity}× {item.product.name_ar}</span>
                    <span>{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 border-t border-beige-dark/20 pt-4 text-sm dark:border-white/10">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({couponCode})</span><span>-{formatPrice(discount)}</span></div>}
                {deliveryFee > 0 && <div className="flex justify-between"><span>Delivery</span><span>{formatPrice(deliveryFee)}</span></div>}
                <div className="flex justify-between text-lg font-bold pt-2"><span>Total</span><span className="text-turquoise">{formatPrice(total)}</span></div>
              </div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <Button type="submit" variant="turquoise" size="lg" className="mt-4 w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place Order"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
