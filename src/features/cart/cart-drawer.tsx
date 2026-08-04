"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, Loader2, Tag, ArrowRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { useCart } from "@/features/cart/cart-context";

export function CartDrawer() {
  const {
    items, isOpen, closeCart, removeItem, updateQuantity,
    subtotal, discount, deliveryFee, total, itemCount,
    applyCoupon, couponCode, clearCart,
  } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCoupon = () => {
    if (!couponInput.trim()) return;
    const ok = applyCoupon(couponInput);
    setCouponError(ok ? null : "Invalid coupon code");
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeCart()}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="border-b border-beige-dark/20 pb-4 dark:border-white/10">
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-coffee" />
              Your Cart
              {itemCount > 0 && <span className="text-sm font-normal text-coffee/60">({itemCount})</span>}
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <AnimatePresence mode="popLayout">
              {items.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 text-center">
                  <Logo size="md" href={null} />
                  <p className="mt-4 text-sm font-medium">Your cart is empty</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      className="flex gap-3 rounded-xl bg-beige/30 p-3 dark:bg-white/5"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                        <Image src={item.product.image} alt={item.product.name_ar} fill className="object-cover" sizes="64px" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-semibold" dir="rtl">{item.product.name_ar}</h4>
                            <p className="text-xs text-coffee/60">{formatPrice(item.product.price)}</p>
                          </div>
                          <button onClick={() => removeItem(item.product.id)} className="rounded-lg p-1 text-coffee/40 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-warm-white shadow-sm dark:bg-white/10">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-warm-white shadow-sm dark:bg-white/10">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-turquoise">{formatPrice(item.product.price * item.quantity)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {items.length > 0 && (
            <div className="border-t border-beige-dark/20 p-4 pb-8 dark:border-white/10">
              <div className="mb-3 flex gap-2">
                <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon code" className="h-10" />
                <Button variant="outline" size="sm" onClick={handleCoupon}><Tag className="h-3.5 w-3.5" /> Apply</Button>
              </div>
              {couponError && <p className="mb-2 text-xs text-red-600">{couponError}</p>}
              {couponCode && <p className="mb-2 text-xs text-emerald-600">Coupon {couponCode} applied!</p>}

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-coffee/70"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
                {deliveryFee > 0 && <div className="flex justify-between text-coffee/70"><span>Delivery</span><span>{formatPrice(deliveryFee)}</span></div>}
                <div className="flex justify-between border-t border-beige-dark/20 pt-2 text-lg font-bold dark:border-white/10">
                  <span>Total</span><span className="text-turquoise">{formatPrice(total)}</span>
                </div>
              </div>

              <Link href="/checkout" onClick={closeCart}>
                <Button variant="turquoise" size="lg" className="mt-4 w-full">
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle>Thank you!</DialogTitle>
            <DialogDescription>Your order has been placed.</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccess(false)}>Continue</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
