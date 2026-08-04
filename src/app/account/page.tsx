"use client";

import { motion } from "framer-motion";
import { Users, ClipboardList, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Logo } from "@/components/brand/logo";
import { useT } from "@/components/providers/locale-provider";
import { BRAND } from "@/lib/brand";

export default function AccountPage() {
  const t = useT();

  const menuItems = [
    { href: "/admin", label: t("account.adminPanel"), icon: Shield },
    { href: "/orders", label: t("orders.title"), icon: ClipboardList },
    { href: "/admin/customers", label: t("admin.customers"), icon: Users },
    { href: "/admin/settings", label: t("admin.settings"), icon: Settings },
  ];

  return (
    <>
      <PageHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center rounded-2xl bg-warm-white p-8 text-center shadow-soft sm:flex-row sm:items-center sm:gap-6 sm:text-start"
        >
          <Logo size="xl" href={null} className="justify-center" />
          <div>
            <h2 className="font-display text-xl font-bold text-dark-brown md:text-2xl">
              {BRAND.name}
            </h2>
            <p className="mt-1 text-sm text-turquoise">{t("brand.tagline")}</p>
            <p className="mt-2 text-sm text-coffee/60">{t("account.welcome")}</p>
          </div>
        </motion.div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={item.href}>
                  <div className="flex items-center gap-3 rounded-xl bg-warm-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-beige/60">
                      <Icon className="h-5 w-5 text-coffee" strokeWidth={1.75} />
                    </div>
                    <span className="text-sm font-medium text-dark-brown">{item.label}</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}
