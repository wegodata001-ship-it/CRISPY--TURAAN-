"use client";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CartPanel } from "@/features/cart/cart-panel";
import { useCart } from "@/features/cart/cart-context";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const t = useT();
  const { isOpen, closeCart } = useCart();
  const isMobile = useIsMobile(1024);
  const { dir } = useLocale();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeCart()}>
        <DrawerContent className="h-[88dvh] max-h-[88dvh] rounded-t-3xl bg-warm-white">
          <div className="min-h-0 flex-1 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <CartPanel
              compact
              onCheckout={closeCart}
              className="flex h-full min-h-0 flex-col"
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <DialogContent
        layout="custom"
        dir={dir}
        className={cn(
          "top-0 flex h-[100dvh] w-[min(420px,92vw)] max-w-none flex-col gap-0 rounded-none border-y-0 bg-warm-white p-0",
          dir === "rtl"
            ? "left-0 right-auto border-l"
            : "left-auto right-0 border-r"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("cart.title")}</DialogTitle>
          <DialogDescription>{t("cart.title")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 px-6 pb-6 pt-7">
          <CartPanel
            onCheckout={closeCart}
            className="flex h-full min-h-0 flex-col"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
