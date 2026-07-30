"use client";

import Link from "next/link";
import { Search, Bell, ShoppingBag, User } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { useCart } from "@/features/cart/cart-context";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header({ searchQuery, onSearchChange }: HeaderProps) {
  const { itemCount, openCart } = useCart();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-40 glass border-b border-beige-dark/20"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:gap-4 md:px-6 md:py-3">
        <Logo size="sm" href="/" priority className="md:hidden" />
        <Logo size="md" href="/" showText showTagline priority className="hidden md:flex" />

        <div className="relative flex-1 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-warm-white/60 border-beige-dark/30 h-9 md:h-10"
          />
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon-sm" className="relative hidden md:flex">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-turquoise" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            onClick={openCart}
          >
            <ShoppingBag className="h-4 w-4" />
            {itemCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-turquoise text-[10px] font-bold text-warm-white"
              >
                {itemCount}
              </motion.span>
            )}
          </Button>

          <Link href="/account">
            <Button variant="ghost" size="icon-sm">
              <User className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
