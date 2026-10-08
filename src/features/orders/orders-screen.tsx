"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice, formatDate } from "@/lib/utils";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { useOrders, useOrderStats } from "@/hooks/useOrders";
import {
  CUSTOMER_ORDER_STATUS_LABEL_KEY,
  ORDER_STATUSES,
  orderStatusBadgeVariant,
} from "@/lib/orders/operations";
import type { OrderStatus } from "@/types";

const statusFilters: (OrderStatus | "all")[] = ["all", ...ORDER_STATUSES];

export function OrdersScreen() {
  const t = useT();
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const { orders, loading } = useOrders({ search, status: statusFilter });
  const { stats } = useOrderStats();

  const statCards = [
    { key: "received" as const, count: stats.received, color: "text-amber-600" },
    { key: "preparing" as const, count: stats.preparing, color: "text-orange-600" },
    { key: "ready" as const, count: stats.ready, color: "text-emerald-600" },
    { key: "delivered" as const, count: stats.delivered, color: "text-green-600" },
    { key: "cancelled" as const, count: stats.cancelled, color: "text-red-500" },
    { key: "total" as const, count: stats.total, color: "text-coffee" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl font-bold text-dark-brown md:text-3xl">
          {t("orders.title")}
        </h1>
        <p className="mt-1 text-sm text-coffee/60">
          {stats.total} {t("orders.totalOrders")}
        </p>
      </motion.div>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6 md:gap-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-warm-white p-3 text-center shadow-soft md:p-4"
          >
            <p className={`text-lg font-bold md:text-2xl ${stat.color}`}>{stat.count}</p>
            <p className="text-[10px] text-coffee/50 md:text-xs">
              {stat.key === "total" ? t("orders.total") : t(CUSTOMER_ORDER_STATUS_LABEL_KEY[stat.key])}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40" strokeWidth={1.75} />
          <Input
            placeholder={t("orders.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            aria-label={t("orders.search")}
          />
        </div>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {statusFilters.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === status
                  ? "bg-coffee text-warm-white"
                  : "bg-beige/60 text-coffee hover:bg-beige"
              }`}
            >
              {status === "all" ? t("common.all") : t(CUSTOMER_ORDER_STATUS_LABEL_KEY[status])}
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
        <EmptyState
          icon={Package}
          title={t("orders.empty")}
          description={t("orders.emptyHint")}
          actionLabel={t("orders.viewMenu")}
          actionHref="/"
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-beige-dark/20 bg-warm-white shadow-soft md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-beige-dark/20 bg-beige/30">
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    {t("orders.orderNumber")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    {t("orders.customer")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    {t("orders.status")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    {t("orders.items")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    {t("orders.total")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    {t("orders.date")}
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
                      <span className="text-sm font-semibold text-dark-brown">{order.orderNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-coffee/70">{order.customerName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={orderStatusBadgeVariant(order.status)}>
                        {t(CUSTOMER_ORDER_STATUS_LABEL_KEY[order.status])}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {order.items.map((item) => (
                          <span key={item.productId} className="text-xs text-coffee/60">
                            {item.quantity}× {item.productName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-coffee">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 text-sm text-coffee/60">
                      {formatDate(order.createdAt, locale)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

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
                    <p className="text-sm font-semibold text-dark-brown">{order.orderNumber}</p>
                    <p className="text-xs text-coffee/60">{order.customerName}</p>
                  </div>
                  <Badge variant={orderStatusBadgeVariant(order.status)}>
                    {t(CUSTOMER_ORDER_STATUS_LABEL_KEY[order.status])}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-coffee/60">
                    <Package className="h-3 w-3" strokeWidth={1.75} />
                    {order.items.length} {t("orders.items")}
                  </div>
                  <span className="text-sm font-bold text-coffee">{formatPrice(order.total)}</span>
                </div>
                <p className="mt-1 text-[10px] text-coffee/40">
                  {formatDate(order.createdAt, locale)}
                </p>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
