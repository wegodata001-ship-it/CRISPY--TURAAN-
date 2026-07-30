"use client";

import { motion } from "framer-motion";
import { Search, Phone, MapPin, ShoppingBag, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateShort, getInitials } from "@/lib/utils";
import { useCustomers } from "@/hooks/useCustomers";
import { useState } from "react";

export function CustomersScreen() {
  const [search, setSearch] = useState("");
  const { customers, loading } = useCustomers(search);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-display text-2xl font-bold text-dark-brown md:text-3xl">
          Customers
        </h1>
        <p className="mt-1 text-sm text-coffee/60">
          {customers.length} registered customers
        </p>
      </motion.div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40" />
        <Input
          placeholder="Search by name, phone, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-2xl border border-beige-dark/20 bg-warm-white shadow-soft md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-beige-dark/20 bg-beige/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Orders
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Last Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-coffee/60">
                    Favorites
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-beige-dark/10 transition-colors hover:bg-beige/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-coffee/10 text-coffee text-xs">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-dark-brown">
                            {customer.name}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-coffee/50">
                            <MapPin className="h-3 w-3" />
                            {customer.address}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm text-coffee/70">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{customer.ordersCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-coffee/70">
                      {formatDateShort(customer.lastOrder)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {customer.favoriteItems.slice(0, 2).map((item) => (
                          <Badge key={item} variant="outline" className="text-[10px]">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-3 md:hidden">
            {customers.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl bg-warm-white p-4 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-coffee/10 text-coffee">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-dark-brown truncate">
                      {customer.name}
                    </h3>
                    <p className="flex items-center gap-1 text-xs text-coffee/50">
                      <Phone className="h-3 w-3 shrink-0" />
                      {customer.phone}
                    </p>
                  </div>
                  <Badge variant="secondary">{customer.ordersCount}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-coffee/60">
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" />
                    Last: {formatDateShort(customer.lastOrder)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {customer.favoriteItems.map((item) => (
                    <Badge key={item} variant="outline" className="text-[10px]">
                      <Heart className="h-2.5 w-2.5 mr-0.5" />
                      {item}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
