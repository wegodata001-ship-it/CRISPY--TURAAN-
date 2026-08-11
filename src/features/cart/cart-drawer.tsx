"use client";

import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CartPanel } from "@/features/cart/cart-panel";
import { useCart } from "@/features/cart/cart-context";
import { useT } from "@/components/providers/locale-provider";
import { useIsMobile } from "@/hooks/useIsMobile";

export function CartDrawer() {
  const t = useT();
  const { isOpen, closeCart } = useCart();
  const isMobile = useIsMobile(1024);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isMobile) return null;

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeCart()}>
        <DrawerContent className="max-h-[92vh] rounded-t-3xl bg-warm-white">
          <div className="px-5 pb-8 pt-2">
            <CartPanel compact onCheckout={closeCart} />
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle>{t("checkout.success")}</DialogTitle>
            <DialogDescription>{t("checkout.successHint")}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccess(false)}>{t("cart.continueShopping")}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
