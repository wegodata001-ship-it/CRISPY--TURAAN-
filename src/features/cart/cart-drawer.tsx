"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { useCart } from "@/features/cart/cart-context";
import {
  createOrderFromCart,
  getOrCreateGuestCustomer,
} from "@/services";

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    total,
    itemCount,
    clearCart,
  } = useCart();
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const guestResult = await getOrCreateGuestCustomer();
      if (!guestResult.success) {
        setCheckoutError(guestResult.error);
        return;
      }
      const orderResult = await createOrderFromCart(
        items,
        guestResult.data.id,
        guestResult.data.name
      );
      if (!orderResult.success) {
        setCheckoutError(orderResult.error);
        return;
      }
      closeCart();
      setShowSuccess(true);
      clearCart();
    } catch {
      setCheckoutError("Failed to place order. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeCart()}>
        <DrawerContent>
          <DrawerHeader className="border-b border-beige-dark/20 pb-4">
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-coffee" />
              Your Cart
              {itemCount > 0 && (
                <span className="text-sm font-normal text-coffee/60">
                  ({itemCount} items)
                </span>
              )}
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <AnimatePresence mode="popLayout">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center">
                    <Logo size="md" href={null} />
                  </div>
                  <p className="text-sm font-medium text-dark-brown">
                    Your cart is empty
                  </p>
                  <p className="mt-1 text-xs text-coffee/50">
                    Add items from the menu to get started
                  </p>
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
                      className="flex gap-3 rounded-xl bg-beige/30 p-3"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={item.product.image}
                          alt={item.product.name_en}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-dark-brown">
                              {item.product.name_en}
                            </h4>
                            <p className="text-xs text-coffee/60">
                              {formatPrice(item.product.price)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="rounded-lg p-1 text-coffee/40 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity - 1
                                )
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-warm-white text-coffee shadow-sm transition-colors hover:bg-beige"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity + 1
                                )
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-warm-white text-coffee shadow-sm transition-colors hover:bg-beige"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-coffee">
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {items.length > 0 && (
            <div className="border-t border-beige-dark/20 p-4 pb-8">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-coffee/70">Total</span>
                <span className="text-xl font-bold text-dark-brown">
                  {formatPrice(total)}
                </span>
              </div>
              {checkoutError && (
                <p className="mb-3 text-center text-xs text-red-600">{checkoutError}</p>
              )}
              <Button
                variant="turquoise"
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Checkout"
                )}
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="text-center">
          <DialogHeader>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"
            >
              <span className="text-3xl">✓</span>
            </motion.div>
            <DialogTitle className="text-center">
              Thank you for your order!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your order has been received and saved successfully.
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="default"
            className="w-full mt-2"
            onClick={() => setShowSuccess(false)}
          >
            Continue Shopping
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
