"use client";

import { motion } from "framer-motion";
import { Users, ClipboardList, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/brand";

const menuItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
  { href: "/orders", label: "My Orders", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin", label: "Settings", icon: Settings },
];

export default function AccountPage() {
  return (
    <>
      <PageHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center rounded-2xl bg-warm-white p-8 shadow-soft text-center sm:flex-row sm:text-left sm:items-center sm:gap-6"
        >
          <Logo size="xl" href={null} className="justify-center" />
          <div>
            <h2 className="font-display text-xl font-bold text-dark-brown md:text-2xl">
              {BRAND.name}
            </h2>
            <p className="mt-1 text-sm text-turquoise">{BRAND.tagline}</p>
            <p className="mt-2 text-sm text-coffee/60">
              Welcome back — manage your café from here.
            </p>
          </div>
        </motion.div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={item.href}>
                  <div className="flex items-center gap-3 rounded-xl bg-warm-white p-4 shadow-soft transition-all hover:shadow-elevated hover:-translate-y-0.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-beige/60">
                      <Icon className="h-5 w-5 text-coffee" />
                    </div>
                    <span className="text-sm font-medium text-dark-brown">
                      {item.label}
                    </span>
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
