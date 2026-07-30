"use client";

import { motion } from "framer-motion";
import {
  Package,
  ClipboardList,
  Users,
  Tags,
  TrendingUp,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useOrders } from "@/hooks/useOrders";
import { formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const quickLinks = [
  { href: "/admin/products", label: "Manage Products", icon: Package },
  { href: "/admin/orders", label: "View Orders", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/categories", label: "Categories", icon: Tags },
];

export function AdminDashboard() {
  const { products, loading: productsLoading } = useProducts();
  const { customers, loading: customersLoading } = useCustomers();
  const { orders, stats, loading: ordersLoading } = useOrders();

  const loading = productsLoading || customersLoading || ordersLoading;
  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);

  const statsCards = [
    { label: "Products", value: products.length, icon: Package, color: "text-coffee" },
    { label: "Orders", value: stats.total, icon: ClipboardList, color: "text-turquoise" },
    { label: "Customers", value: customers.length, icon: Users, color: "text-coffee" },
    { label: "Revenue", value: formatPrice(revenue), icon: TrendingUp, color: "text-gold" },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-dark-brown md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-coffee/60">
          Overview of your café operations
        </p>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {statsCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-warm-white p-4 shadow-soft md:p-5"
            >
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <p className={`mt-3 text-xl font-bold md:text-2xl ${card.color}`}>
                    {card.value}
                  </p>
                  <p className="text-xs text-coffee/50">{card.label}</p>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-warm-white p-5 shadow-soft"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-dark-brown">
            <Clock className="h-4 w-4 text-turquoise" />
            Order Status
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Pending", count: stats.pending, color: "bg-amber-100 text-amber-700" },
              { label: "Preparing", count: stats.preparing, color: "bg-blue-100 text-blue-700" },
              { label: "Ready", count: stats.ready, color: "bg-emerald-100 text-emerald-700" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                <p className="text-lg font-bold">{loading ? "—" : s.count}</p>
                <p className="text-[10px] font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl bg-warm-white p-5 shadow-soft"
        >
          <h2 className="text-sm font-semibold text-dark-brown">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-xl bg-beige/40 px-3 py-3 text-sm font-medium text-dark-brown transition-all hover:bg-beige/70 hover:shadow-soft"
                >
                  <Icon className="h-4 w-4 text-turquoise" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 rounded-2xl bg-warm-white p-5 shadow-soft"
      >
        <h2 className="text-sm font-semibold text-dark-brown">Recent Orders</h2>
        <div className="mt-3 space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))
          ) : orders.length === 0 ? (
            <p className="py-4 text-center text-sm text-coffee/50">No orders yet</p>
          ) : (
            orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl bg-beige/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-dark-brown">{order.orderNumber}</p>
                  <p className="text-xs text-coffee/50">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-coffee">{formatPrice(order.total)}</p>
                  <p className="text-[10px] capitalize text-coffee/50">{order.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
