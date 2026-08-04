"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ClipboardList,
  Users,
  TrendingUp,
  Calendar,
  Star,
  Activity,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useOrders } from "@/hooks/useOrders";
import { formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisMonth(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function AdminDashboard() {
  const { products, loading: productsLoading } = useProducts();
  const { customers, loading: customersLoading } = useCustomers();
  const { orders, stats, loading: ordersLoading } = useOrders();

  const loading = productsLoading || customersLoading || ordersLoading;

  const metrics = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "delivered");
    const todayOrders = orders.filter((o) => isToday(o.createdAt));
    const monthOrders = orders.filter((o) => isThisMonth(o.createdAt));
    const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
    const monthSales = monthOrders.reduce((s, o) => s + o.total, 0);
    const totalRevenue = delivered.reduce((s, o) => s + o.total, 0);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const label = d.toLocaleDateString("en", { weekday: "short" });
      const dayOrders = orders.filter(
        (o) => new Date(o.createdAt).toDateString() === d.toDateString()
      );
      return {
        day: label,
        sales: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
      };
    });

    const popularProducts = products
      .filter((p) => p.isPopular)
      .slice(0, 5)
      .map((p) => ({ name: p.name_ar.slice(0, 12), count: p.isPopular ? 1 : 0 }));

    return {
      todaySales,
      monthSales,
      totalRevenue,
      todayOrders: todayOrders.length,
      chartData: last7Days,
      popularProducts,
    };
  }, [orders, products]);

  const statsCards = [
    { label: "Today Sales", value: formatPrice(metrics.todaySales), icon: Calendar, color: "text-turquoise" },
    { label: "Month Sales", value: formatPrice(metrics.monthSales), icon: TrendingUp, color: "text-gold" },
    { label: "Orders", value: stats.total, icon: ClipboardList, color: "text-coffee" },
    { label: "Customers", value: customers.length, icon: Users, color: "text-coffee" },
    { label: "Products", value: products.length, icon: Package, color: "text-turquoise" },
    { label: "Revenue", value: formatPrice(metrics.totalRevenue), icon: Activity, color: "text-gold" },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-dark-brown md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-coffee/60">
          Real-time overview · {metrics.todayOrders} orders today
        </p>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 md:gap-4">
        {statsCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-warm-white p-4 shadow-soft"
            >
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                  <p className={`mt-2 text-lg font-bold md:text-xl ${card.color}`}>
                    {card.value}
                  </p>
                  <p className="text-[10px] text-coffee/50">{card.label}</p>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-warm-white p-5 shadow-soft"
        >
          <h2 className="text-sm font-semibold text-dark-brown">Sales — Last 7 Days</h2>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.chartData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007A80" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#007A80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#3D2B2440" />
                <YAxis tick={{ fontSize: 11 }} stroke="#3D2B2440" />
                <Tooltip formatter={(v) => formatPrice(Number(v))} />
                <Area type="monotone" dataKey="sales" stroke="#007A80" fill="url(#salesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-warm-white p-5 shadow-soft"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-dark-brown">
            <Star className="h-4 w-4 text-gold" />
            Popular Products
          </h2>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.popularProducts}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#3D2B2440" />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill="#D4A76A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-6 rounded-2xl bg-warm-white p-5 shadow-soft"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-dark-brown">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs font-medium text-turquoise hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))
          ) : orders.length === 0 ? (
            <p className="py-4 text-center text-sm text-coffee/50">No orders yet</p>
          ) : (
            orders.slice(0, 8).map((order) => (
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
