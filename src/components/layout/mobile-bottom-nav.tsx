"use client";

import { usePathname } from "next/navigation";
import { useHideCustomerChrome } from "@/hooks/useAdminPath";
import { Home, Search, ShoppingBag, User, Coffee } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/features/cart/cart-context";
import { cn } from "@/lib/utils";

const links = [
  { href: "/catalog", icon: Home, label: "Home" },
  { href: "/catalog#menu", icon: Coffee, label: "Menu" },
  { href: "/catalog#search", icon: Search, label: "Search" },
  { href: "/cart", icon: ShoppingBag, label: "Cart", cart: true },
  { href: "/account", icon: User, label: "Account" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const hideChrome = useHideCustomerChrome();
  const { itemCount, openCart } = useCart();

  if (hideChrome) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-beige-dark/20 bg-warm-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
        {links.map(({ href, icon: Icon, label, cart }) => {
          const active = pathname === href || (href === "/catalog" && pathname === "/");
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (cart) {
                  openCart();
                  return;
                }
                if (href.includes("#")) {
                  const id = href.split("#")[1];
                  document.getElementById(id!)?.scrollIntoView({ behavior: "smooth" });
                  return;
                }
                window.location.href = href;
              }}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors",
                active ? "text-turquoise" : "text-coffee/50"
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute inset-0 rounded-xl bg-turquoise/10"
                />
              )}
              <span className="relative">
                <Icon className="h-5 w-5" />
                {cart && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-turquoise px-1 text-[9px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </span>
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
