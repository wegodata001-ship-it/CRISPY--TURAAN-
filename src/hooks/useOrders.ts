"use client";

import { useState, useEffect, useMemo } from "react";
import type { Order, OrderStatus } from "@/types";
import { subscribeToOrders } from "@/services/orderService";

export function useOrders(filters?: {
  search?: string;
  status?: OrderStatus | "all";
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const parsedFilters = filterKey
      ? (JSON.parse(filterKey) as { search?: string; status?: OrderStatus | "all" })
      : undefined;

    const unsubscribe = subscribeToOrders(
      parsedFilters,
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [filterKey]);

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    }),
    [orders]
  );

  return { orders, loading, error, stats };
}

export function useOrderStats() {
  const { stats, loading } = useOrders();
  return { stats, loading };
}
