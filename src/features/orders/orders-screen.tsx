"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatDate } from "@/lib/utils";
import { EmptyStateBackground } from "@/components/brand/store-image";
import { Logo } from "@/components/brand/logo";
import { useOrders, useOrderStats } from "@/hooks/useOrders";
import type { OrderStatus } from "@/types";

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "pending" | "preparing" | "ready" | "delivered" | "cancelled" }
> = {
  pending: { label: "Pending", variant: "pending" },
  preparing: { label: "Preparing", variant: "preparing" },
  ready: { label: "Ready", variant: "ready" },
  delivered: { label: "Delivered", variant: "delivered" },
  cancelled: { label: "Cancelled", variant: "cancelled" },
};

const statusFilters: (OrderStatus | "all")[] = [
  "all",
  "pending",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

export function OrdersScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const { orders, loading } = useOrders({ search, status: statusFilter });
  const { stats } = useOrderStats();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-display text-2xl font-bold text-dark-brown md:text-3xl">
          Orders
        </h1>
        <p className="mt-1 text-sm text-coffee/60">
          {stats.total} total orders
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6 md:gap-3">
        {[
          { label: "Pending", count: stats.pending, color: "text-amber-600" },
          { label: "Preparing", count: stats.preparing, color: "text-blue-600" },
          { label: "Ready", count: stats.ready, color: "text-emerald-600" },
          { label: "Delivered", count: stats.delivered, color: "text-green-600" },
          { label: "Cancelled", count: stats.cancelled, color: "text-red-500" },
          { label: "Total", count: stats.total, color: "text-coffee" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-warm-white p-3 text-center shadow-soft md:p-4"
          >
            <p className={`text-lg font-bold md:text-2xl ${stat.color}`}>
              {stat.count}
            </p>
            <p className="text-[10px] text-coffee/50 md:text-xs">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === status
                  ? "bg-coffee text-warm-white"
                  : "bg-beige/60 text-coffee hover:bg-beige"
              }`}
            >
              {status === "all"
                ? "All"
                : statusConfig[status].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyStateBackground>
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Logo size="md" href={null} />
            <h3 className="mt-4 text-lg font-semibold text-dark-brown">No orders yet</h3>
            <p className="mt-1 text-sm text-coffee/60">
              Orders will appear here once placed
            </p>
          </div>
        </EmptyStateBackground>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-beige-dark/20 bg-warm-white shadow-soft md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-beige-dark/20 bg-beige/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-beige-dark/10 transition-colors hover:bg-beige/20"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-dark-brown">
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-coffee/70">
                      {order.customerName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusConfig[order.status].variant}>
                        {statusConfig[order.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {order.items.map((item) => (
                          <span
                            key={item.productId}
                            className="text-xs text-coffee/60"
                          >
                            {item.quantity}x {item.productName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-coffee">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 text-sm text-coffee/60">
                      {formatDate(order.createdAt)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl bg-warm-white p-4 shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-dark-brown">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-coffee/60">
                      {order.customerName}
                    </p>
                  </div>
                  <Badge variant={statusConfig[order.status].variant}>
                    {statusConfig[order.status].label}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-coffee/60">
                    <Package className="h-3 w-3" />
                    {order.items.length} items
                  </div>
                  <span className="text-sm font-bold text-coffee">
                    {formatPrice(order.total)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-coffee/40">
                  {formatDate(order.createdAt)}
                </p>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
