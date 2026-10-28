"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Copy, FileText, Layers, Loader2, MoreVertical, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/providers/locale-provider";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL_KEY,
  effectivePaymentStatus,
  isTerminalOrderStatus,
  nextOrderStatus,
  orderAgeMinutes,
} from "@/lib/orders/operations";
import { formatDate, formatPrice, cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  received: "border-amber-300 bg-amber-50 text-amber-900",
  preparing: "border-orange-300 bg-orange-50 text-orange-800",
  ready: "border-emerald-300 bg-emerald-50 text-emerald-800",
  delivered: "border-beige-dark bg-cream text-dark-brown",
  cancelled: "border-red-300 bg-red-50 text-red-700",
};

const STATUS_BORDER: Record<OrderStatus, string> = {
  received: "border-s-gold",
  preparing: "border-s-orange-500",
  ready: "border-s-[#2E9B55]",
  delivered: "border-s-dark-brown",
  cancelled: "border-s-crispy-red",
};

function OrderItems({
  order,
  expanded,
  onEditItem,
}: {
  order: Order;
  expanded: boolean;
  onEditItem?: (index: number) => void;
}) {
  const items = expanded ? order.items : order.items.slice(0, 3);
  const canEdit = expanded && onEditItem && !isTerminalOrderStatus(order.status);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.productId}-${index}`} className="text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-dark-brown dark:text-warm-white">
              {item.quantity}× {item.productName}
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => onEditItem(index)}
                className="rounded-lg p-1.5 text-coffee/50 hover:bg-beige/50 hover:text-turquoise"
                aria-label="Edit extras"
              >
                <Layers className="h-4 w-4" />
              </button>
            )}
          </div>
          {item.modifiers?.map((modifier) => (
            <p key={`${modifier.groupId}-${modifier.optionId}`} className="ps-4 text-xs text-coffee/65">
              + {modifier.groupName ? `${modifier.groupName}: ` : ""}
              {modifier.optionName}
              {modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""}
              {modifier.kitchenNote ? ` — ${modifier.kitchenNote}` : ""}
            </p>
          ))}
          {item.kitchenNotes?.map((note) => (
            <p key={note} className="ps-4 text-xs font-medium text-orange-800">
              • {note}
            </p>
          ))}
          {item.notes && <p className="ps-4 text-xs italic text-coffee/60">{item.notes}</p>}
        </div>
      ))}
      {!expanded && order.items.length > items.length && (
        <p className="text-xs text-coffee/45">+{order.items.length - items.length}</p>
      )}
    </div>
  );
}

export function OrderCard({
  order,
  expanded,
  updating,
  onToggle,
  onStatusChange,
  onCancel,
  onPrint,
  onThermalReprint,
  onExportPdf,
  onCopyNumber,
  onEditItem,
}: {
  order: Order;
  expanded: boolean;
  updating: boolean;
  onToggle: () => void;
  onStatusChange: (status: OrderStatus) => void;
  onCancel: () => void;
  onPrint: () => void;
  onThermalReprint?: () => void;
  onExportPdf?: () => void;
  onCopyNumber?: () => void;
  onEditItem?: (index: number) => void;
}) {
  const t = useT();
  const next = nextOrderStatus(order.status);
  const age = orderAgeMinutes(order);
  const urgent = age >= 15 && order.status === "received";
  const paymentStatus = effectivePaymentStatus(order);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <article
      className={cn(
        "rounded-2xl border border-beige-dark/15 border-s-4 bg-warm-white p-4 shadow-soft dark:border-white/10 dark:bg-white/5",
        STATUS_BORDER[order.status],
        urgent && "ring-2 ring-amber-400/40"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-start">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-dark-brown dark:text-warm-white">{order.orderNumber}</span>
            <Badge variant="outline" className={STATUS_STYLE[order.status]}>
              {t(ORDER_STATUS_LABEL_KEY[order.status])}
            </Badge>
            <Badge
              variant="outline"
              className={
                paymentStatus === "paid"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : paymentStatus === "failed"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : paymentStatus === "refunded"
                      ? "border-slate-300 bg-slate-100 text-slate-700"
                      : "border-amber-300 bg-amber-50 text-amber-700"
              }
            >
              {t(`admin.payment.${paymentStatus}`)}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-coffee/55">
            <span className="font-medium text-coffee/80">{order.customerName}</span>
            {order.customerPhone ? <span dir="ltr">• {order.customerPhone}</span> : null}
            <span>
              • {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className={cn("inline-flex items-center gap-1", urgent && "font-bold text-amber-800")}>
              <Clock className="h-3.5 w-3.5" />
              {age < 1
                ? t("admin.orders.justNow")
                : t("admin.orders.minutesAgo").replace("{count}", String(age))}
            </span>
          </div>
        </button>

        <div className="text-end">
          <p className="text-xl font-bold text-coffee">{formatPrice(order.total)}</p>
          {order.orderType && (
            <p className="text-xs text-coffee/45">{t(`admin.orders.type.${order.orderType}`)}</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-cream/55 p-3 dark:bg-white/5">
        <OrderItems order={order} expanded={expanded} onEditItem={onEditItem} />
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4 border-t border-beige-dark/15 pt-4 text-sm md:grid-cols-2">
          <div className="space-y-1">
            <p className="font-semibold">{t("orders.customer")}</p>
            <p>{order.customerName}</p>
            {order.customerPhone && (
              <p dir="ltr" className="text-start">
                <a className="font-semibold text-[#A90F16]" href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
              </p>
            )}
            <p>{order.phoneVerified ? t("admin.orders.phoneVerified", "الهاتف مؤكد") : t("admin.orders.phoneUnverified", "الهاتف غير مؤكد")}</p>
            {order.deliveryAddress && <p>{order.deliveryAddress}</p>}
          </div>
          <div className="space-y-1">
            <p className="font-semibold">{t("orders.date")}</p>
            <p>{formatDate(order.createdAt)}</p>
            <p>{t("admin.orders.paymentMethod")}: {order.paymentMethod || "—"}</p>
            {order.couponCode ? (
              <p>
                {t("admin.coupons.discount")}: {order.couponCode}
                {order.couponDiscountType === "percent" ? ` (${order.couponDiscountValue}%)` : ""}
                {(order.discount ?? 0) > 0 ? ` −${formatPrice(order.discount ?? 0)}` : ""}
              </p>
            ) : null}
          </div>
          {order.notes && (
            <div className="rounded-xl bg-amber-50 p-3 text-amber-900 md:col-span-2">
              <p className="font-semibold">{t("builder.notes")}</p>
              <p className="whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {next && (
          <Button
            type="button"
            className="min-h-10 flex-1 rounded-xl sm:flex-none"
            disabled={updating}
            onClick={() => onStatusChange(next)}
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t(`admin.orders.next.${order.status}`)}
          </Button>
        )}

        <Select
          value={order.status}
          onValueChange={(value) => onStatusChange(value as OrderStatus)}
          disabled={updating}
        >
          <SelectTrigger className="h-10 w-[150px]">
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(ORDER_STATUS_LABEL_KEY[status])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" onClick={onPrint} title={t("admin.orders.printTicket")}>
          <Printer className="h-4 w-4" />
          {t("admin.orders.printTicket")}
        </Button>

        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t("admin.orders.moreActions")}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {menuOpen && (
            <div className="absolute end-0 z-20 mt-1 min-w-44 rounded-xl border border-beige-dark/20 bg-warm-white p-1 shadow-soft">
              {onThermalReprint && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-beige/40"
                  onClick={() => {
                    setMenuOpen(false);
                    onThermalReprint();
                  }}
                >
                  <Printer className="h-4 w-4" />
                  {t("admin.orders.thermalReprint", "הדפס מחדש")}
                </button>
              )}
              {onExportPdf && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-beige/40"
                  onClick={() => {
                    setMenuOpen(false);
                    onExportPdf();
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {t("admin.orders.exportPdf")}
                </button>
              )}
              {onCopyNumber && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-beige/40"
                  onClick={() => {
                    setMenuOpen(false);
                    onCopyNumber();
                  }}
                >
                  <Copy className="h-4 w-4" />
                  {t("admin.orders.copyNumber")}
                </button>
              )}
              {!isTerminalOrderStatus(order.status) && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onCancel();
                  }}
                >
                  {t("admin.orders.cancel")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
