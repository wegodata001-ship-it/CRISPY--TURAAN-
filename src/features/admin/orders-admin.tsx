"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
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
import type { Order, OrderStatus } from "@/types";

const statuses: OrderStatus[] = ["pending", "preparing", "ready", "delivered", "cancelled"];

const statusVariant: Record<OrderStatus, "pending" | "preparing" | "ready" | "delivered" | "cancelled"> = {
  pending: "pending",
  preparing: "preparing",
  ready: "ready",
  delivered: "delivered",
  cancelled: "cancelled",
};

export function OrdersAdmin() {
  const { orders, loading } = useOrders();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    setUpdating(order.id);
    await updateOrder(order.id, { status });
    setUpdating(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    await deleteOrder(id);
  };

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-dark-brown">Orders</h1>
        <p className="text-sm text-coffee/60">{orders.length} total orders</p>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="rounded-2xl bg-warm-white p-4 shadow-soft md:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-dark-brown">{order.orderNumber}</p>
                    <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-coffee/60">{order.customerName}</p>
                  <p className="text-xs text-coffee/40">{formatDate(order.createdAt)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {order.items.map((item) => (
                      <span key={item.productId} className="text-xs text-coffee/60">
                        {item.quantity}× {item.productName}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-coffee">{formatPrice(order.total)}</p>
                  <Select
                    value={order.status}
                    onValueChange={(v) => handleStatusChange(order, v as OrderStatus)}
                    disabled={updating === order.id}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      {updating === order.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(order.id)}>
                    Delete
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
