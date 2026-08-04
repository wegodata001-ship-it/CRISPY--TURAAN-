"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, User, ShoppingBag, Heart, StickyNote } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCustomers } from "@/hooks/useCustomers";
import { useOrders } from "@/hooks/useOrders";
import { createCustomer, updateCustomer, deleteCustomer } from "@/services";
import { customerSchema, type CustomerInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getInitials, formatDateShort, formatPrice } from "@/lib/utils";
import type { Customer } from "@/types";

export function CustomersAdmin() {
  const { customers, loading } = useCustomers();
  const { orders } = useOrders();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "", address: "", favoriteProducts: [], notes: "" },
  });

  const customerOrders = useMemo(() => {
    if (!profile) return [];
    return orders.filter((o) => o.customerId === profile.id);
  }, [orders, profile]);

  const totalSpending = useMemo(() => {
    if (!profile) return 0;
    return customerOrders.reduce((s, o) => s + o.total, 0);
  }, [customerOrders, profile]);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", phone: "", email: "", address: "", favoriteProducts: [], notes: "" });
    setError(null);
    setOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    form.reset({
      name: customer.name,
      phone: customer.phone,
      email: "",
      address: customer.address,
      favoriteProducts: customer.favoriteItems,
      notes: customer.notes,
    });
    setError(null);
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    setError(null);
    const result = editing
      ? await updateCustomer(editing.id, data)
      : await createCustomer(data);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    await deleteCustomer(id);
    if (profile?.id === id) setProfile(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-brown dark:text-warm-white">Customers</h1>
          <p className="text-sm text-coffee/60">{customers.length} customers · CRM profiles</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-beige-dark/20 bg-warm-white shadow-soft dark:border-white/10 dark:bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-beige-dark/20 bg-beige/30 text-left text-xs uppercase tracking-wider text-coffee/60 dark:bg-white/5">
                  <th className="px-4 py-3">Customer</th>
                  <th className="hidden px-4 py-3 md:table-cell">Phone</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Spending</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Last Visit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, i) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-beige-dark/10 hover:bg-beige/20 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setProfile(customer)}
                        className="flex items-center gap-3 text-left"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-beige text-coffee text-xs">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-dark-brown dark:text-warm-white">{customer.name}</p>
                          <p className="text-xs text-coffee/50 md:hidden">{customer.phone}</p>
                        </div>
                      </button>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-coffee/60 md:table-cell">{customer.phone}</td>
                    <td className="px-4 py-3 text-sm font-medium text-coffee">{customer.ordersCount}</td>
                    <td className="hidden px-4 py-3 text-sm text-coffee sm:table-cell">
                      {formatPrice(customer.totalSpending || totalSpendingFor(customer, orders))}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-coffee/50 lg:table-cell">
                      {formatDateShort(customer.lastOrder)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setProfile(customer)}>
                          <User className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(customer)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(customer.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!profile} onOpenChange={(v) => !v && setProfile(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {profile && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                  </Avatar>
                  {profile.name}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-beige/30 p-3 dark:bg-white/5">
                  <p className="text-xs text-coffee/50">Total Orders</p>
                  <p className="text-xl font-bold text-dark-brown dark:text-warm-white">{profile.ordersCount}</p>
                </div>
                <div className="rounded-xl bg-beige/30 p-3 dark:bg-white/5">
                  <p className="text-xs text-coffee/50">Total Spending</p>
                  <p className="text-xl font-bold text-coffee">{formatPrice(totalSpending || profile.totalSpending)}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="text-coffee/50">Phone:</span> {profile.phone}</p>
                <p><span className="text-coffee/50">Address:</span> {profile.address}</p>
                <p><span className="text-coffee/50">Last Visit:</span> {formatDateShort(profile.lastOrder)}</p>
              </div>
              {profile.favoriteItems.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase text-coffee/50">
                    <Heart className="h-3.5 w-3.5" /> Favorite Products
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {profile.favoriteItems.map((item) => (
                      <Badge key={item} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.notes && (
                <div className="rounded-xl bg-beige/20 p-3 dark:bg-white/5">
                  <p className="mb-1 flex items-center gap-1 text-xs font-medium text-coffee/50">
                    <StickyNote className="h-3.5 w-3.5" /> Notes
                  </p>
                  <p className="text-sm">{profile.notes}</p>
                </div>
              )}
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase text-coffee/50">
                  <ShoppingBag className="h-3.5 w-3.5" /> Order History
                </p>
                {customerOrders.length === 0 ? (
                  <p className="text-sm text-coffee/50">No orders yet</p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between rounded-lg border border-beige-dark/20 px-3 py-2 text-sm dark:border-white/10">
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-xs text-coffee/50">{formatDateShort(order.createdAt)}</p>
                        </div>
                        <Badge variant={order.status as "pending"}>{order.status}</Badge>
                        <span className="font-semibold text-coffee">{formatPrice(order.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "New Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register("phone")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...form.register("address")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...form.register("notes")} className="mt-1" rows={3} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save" : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function totalSpendingFor(customer: Customer, orders: { customerId: string; total: number }[]) {
  return orders.filter((o) => o.customerId === customer.id).reduce((s, o) => s + o.total, 0);
}
