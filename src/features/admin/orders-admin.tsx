"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Printer, Search, FileText, ChevronDown } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { updateOrder, deleteOrder } from "@/services";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice, formatDate } from "@/lib/utils";
import { exportHtmlAsPdf } from "@/lib/export-pdf";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import type { Order, OrderStatus } from "@/types";

const statuses: OrderStatus[] = ["pending", "preparing", "ready", "delivered", "cancelled"];

const statusVariant: Record<OrderStatus, "pending" | "preparing" | "ready" | "delivered" | "cancelled"> = {
  pending: "pending",
  preparing: "preparing",
  ready: "ready",
  delivered: "delivered",
  cancelled: "cancelled",
};

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  preparing: "bg-blue-500",
  ready: "bg-emerald-500",
  delivered: "bg-coffee",
  cancelled: "bg-red-500",
};

function OrderTimeline({ status }: { status: OrderStatus }) {
  const t = useT();
  const steps: OrderStatus[] = ["pending", "preparing", "ready", "delivered"];
  const currentIndex = status === "cancelled" ? -1 : steps.indexOf(status);
  const statusLabel = (s: OrderStatus) => t(`admin.status.${s}`);

  return (
    <div className="mt-4 flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "h-3 w-3 rounded-full border-2 transition-colors",
                i <= currentIndex ? statusColors[step] : "border-beige-dark/40 bg-transparent"
              )}
            />
            <span className={cn("text-[10px]", i <= currentIndex ? "text-dark-brown dark:text-warm-white" : "text-coffee/40")}>
              {statusLabel(step)}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("mx-1 h-0.5 flex-1", i < currentIndex ? "bg-coffee/40" : "bg-beige-dark/30")} />
          )}
        </div>
      ))}
      {status === "cancelled" && (
        <Badge variant="cancelled" className="ml-2">{t("admin.status.cancelled")}</Badge>
      )}
    </div>
  );
}

export function OrdersAdmin() {
  const t = useT();
  const { orders, loading } = useOrders();
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const statusLabel = (status: OrderStatus) => t(`admin.status.${status}`);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
  });

  const exportCsv = () => {
    const headers = [
      t("orders.orderNumber"),
      t("orders.customer"),
      t("orders.status"),
      t("orders.total"),
      t("orders.date"),
    ];
    const rows = [
      headers,
      ...filtered.map((o) => [
        o.orderNumber,
        o.customerName,
        statusLabel(o.status),
        String(o.total),
        o.createdAt,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportPdf = () => {
    const headers = [
      t("orders.orderNumber"),
      t("orders.customer"),
      t("orders.status"),
      t("orders.total"),
      t("orders.date"),
    ];
    const rows = filtered.map((o) =>
      `<tr><td>${o.orderNumber}</td><td>${o.customerName}</td><td>${statusLabel(o.status)}</td><td>${formatPrice(o.total)}</td><td>${formatDate(o.createdAt)}</td></tr>`
    ).join("");
    exportHtmlAsPdf(
      t("admin.orders.title"),
      `<h1>${t("admin.orders.title")}</h1>
       <p>${new Date().toLocaleString()}</p>
       <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
       <tbody>${rows}</tbody></table>`
    );
  };

  const printOrders = () => window.print();

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    setUpdating(order.id);
    await updateOrder(order.id, { status });
    setUpdating(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.orders.deleteConfirm"))) return;
    await deleteOrder(id);
  };

  return (
    <div>
      <AdminPageHeader
        title={t("admin.orders.title")}
        subtitle={`${orders.length} ${t("orders.totalOrders")}`}
        actions={
          <>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-coffee/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.orders.search")}
                className="h-10 rounded-xl border border-beige-dark/30 bg-warm-white pl-9 pr-3 text-sm dark:border-white/10 dark:bg-white/5"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
              <SelectTrigger className="h-10 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.status.all")}</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> {t("admin.orders.exportCsv")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileText className="h-3.5 w-3.5" /> {t("admin.orders.exportPdf")}
            </Button>
            <Button variant="outline" size="sm" onClick={printOrders}>
              <Printer className="h-3.5 w-3.5" /> {t("admin.action.print")}
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                "rounded-2xl bg-warm-white p-4 shadow-soft md:p-5 dark:bg-white/5",
                "border-l-4",
                order.status === "pending" && "border-l-amber-500",
                order.status === "preparing" && "border-l-blue-500",
                order.status === "ready" && "border-l-emerald-500",
                order.status === "delivered" && "border-l-coffee",
                order.status === "cancelled" && "border-l-red-500"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <p className="font-semibold text-dark-brown dark:text-warm-white">{order.orderNumber}</p>
                    <Badge variant={statusVariant[order.status]}>{statusLabel(order.status)}</Badge>
                    <ChevronDown className={cn("h-4 w-4 text-coffee/40 transition-transform", expanded === order.id && "rotate-180")} />
                  </button>
                  <p className="mt-1 text-sm text-coffee/60">{order.customerName}</p>
                  <p className="text-xs text-coffee/40">{formatDate(order.createdAt)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {order.items.map((item) => (
                      <div key={`${item.productId}-${item.productName}`} className="text-xs text-coffee/60">
                        <span>{item.quantity}× {item.productName}</span>
                        {item.modifiers?.map((m) => (
                          <p key={m.optionId} className="ps-3 text-[10px] text-coffee/45">
                            + {m.optionName}
                            {m.kitchenNote ? ` (${m.kitchenNote})` : ""}
                          </p>
                        ))}
                        {item.notes && <p className="ps-3 text-[10px] italic">{item.notes}</p>}
                      </div>
                    ))}
                  </div>
                  <AnimatePresence>
                    {expanded === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <OrderTimeline status={order.status} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-coffee">{formatPrice(order.total)}</p>
                  <Select
                    value={order.status}
                    onValueChange={(v) => handleStatusChange(order, v as OrderStatus)}
                    disabled={updating === order.id}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      {updating === order.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(order.id)}>
                    {t("admin.action.delete")}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
