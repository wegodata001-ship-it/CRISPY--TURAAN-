"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  User,
  Plus,
  Search,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

const quickActions = [
  { href: "/admin/products", label: "New Product", icon: Plus },
  { href: "/admin/orders", label: "Orders", icon: Bell },
];

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const title = pathname.split("/").pop()?.replace(/-/g, " ") ?? "dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-beige-dark/20 bg-warm-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1412]/90">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-beige-dark/30 lg:hidden dark:border-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold capitalize text-dark-brown dark:text-warm-white md:text-xl">
            {title}
          </h1>
          <p className="hidden text-xs text-coffee/50 sm:block dark:text-warm-white/50">
            MISHKAT CAFÉ Admin
          </p>
        </div>

        <div className="hidden max-w-xs flex-1 md:block">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-coffee/40" />
            <Input
              placeholder="Search admin..."
              className="h-10 rounded-xl border-beige-dark/30 bg-beige/20 pl-9 dark:border-white/10 dark:bg-white/5"
            />
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button variant="outline" size="sm" className="rounded-xl">
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-beige-dark/30 transition-colors hover:bg-beige/40 dark:border-white/10 dark:hover:bg-white/10"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </button>

        <LanguageSwitcher compact />

        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-beige-dark/30 hover:bg-beige/40 dark:border-white/10 dark:hover:bg-white/10"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-turquoise" />
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 mt-2 w-72 rounded-2xl border border-beige-dark/20 bg-warm-white p-4 shadow-elevated dark:border-white/10 dark:bg-[#1a1412]"
              >
                <p className="text-sm font-semibold text-dark-brown dark:text-warm-white">Notifications</p>
                <p className="mt-2 text-xs text-coffee/50">No new notifications</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-xl border border-beige-dark/30 px-2 py-1.5 hover:bg-beige/40 dark:border-white/10 dark:hover:bg-white/10"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coffee text-xs font-bold text-warm-white">
              {user?.displayName?.charAt(0) ?? "A"}
            </div>
            <span className="hidden text-sm font-medium md:block dark:text-warm-white">
              {user?.displayName}
            </span>
            <ChevronDown className="h-4 w-4 text-coffee/50" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-beige-dark/20 bg-warm-white py-2 shadow-elevated dark:border-white/10 dark:bg-[#1a1412]"
              >
                <div className="border-b border-beige-dark/20 px-4 py-3 dark:border-white/10">
                  <p className="text-sm font-semibold dark:text-warm-white">{user?.displayName}</p>
                  <p className="text-xs text-coffee/50">{user?.email}</p>
                  <span className="mt-1 inline-block rounded-full bg-turquoise/10 px-2 py-0.5 text-[10px] font-medium text-turquoise">
                    {user?.role}
                  </span>
                </div>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-beige/40 dark:hover:bg-white/5"
                  onClick={() => setProfileOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={() => logout()}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
