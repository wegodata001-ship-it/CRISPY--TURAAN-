"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { createProduct, updateProduct, deleteProduct } from "@/services";
import { productSchema, type ProductInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

export function ProductsAdmin() {
  const { products, loading } = useProducts();
  const { categories } = useCategories();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nameAr: "",
      nameEn: "",
      description: "",
      categoryId: "",
      price: 0,
      imageUrl: "",
      available: true,
      popular: false,
      newProduct: false,
      sortOrder: 0,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      nameAr: "",
      nameEn: "",
      description: "",
      categoryId: categories[0]?.id ?? "",
      price: 0,
      imageUrl: "",
      available: true,
      popular: false,
      newProduct: false,
      sortOrder: products.length + 1,
    });
    setError(null);
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    form.reset({
      nameAr: product.name_ar,
      nameEn: product.name_en,
      description: product.description,
      categoryId: product.categoryId,
      price: product.price,
      imageUrl: product.image,
      available: product.available,
      popular: product.isPopular,
      newProduct: product.isNew,
      sortOrder: product.sortOrder,
    });
    setError(null);
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    setError(null);
    const result = editing
      ? await updateProduct(editing.id, data)
      : await createProduct(data);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await deleteProduct(id);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-brown">Products</h1>
          <p className="text-sm text-coffee/60">{products.length} items</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-beige-dark/20 bg-warm-white shadow-soft">
          <table className="w-full">
            <thead>
              <tr className="border-b border-beige-dark/20 bg-beige/30 text-left text-xs uppercase tracking-wider text-coffee/60">
                <th className="px-4 py-3">Product</th>
                <th className="hidden px-4 py-3 md:table-cell">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="hidden px-4 py-3 sm:table-cell">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, i) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-beige-dark/10 hover:bg-beige/20"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                        <Image src={product.image} alt={product.name_en} fill className="object-cover" sizes="40px" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-dark-brown">{product.name_en}</p>
                        <p className="truncate text-xs text-coffee/50" dir="rtl">{product.name_ar}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-coffee/60 md:table-cell">
                    {categories.find((c) => c.id === product.categoryId)?.name_en ?? product.categoryId}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-coffee">{formatPrice(product.price)}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`text-xs font-medium ${product.available ? "text-emerald-600" : "text-red-500"}`}>
                      {product.available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(product)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nameEn">English Name</Label>
                <Input id="nameEn" {...form.register("nameEn")} className="mt-1" />
                {form.formState.errors.nameEn && (
                  <p className="mt-1 text-xs text-red-500">{form.formState.errors.nameEn.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="nameAr">Arabic Name</Label>
                <Input id="nameAr" dir="rtl" {...form.register("nameAr")} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register("description")} className="mt-1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.watch("categoryId")}
                  onValueChange={(v) => form.setValue("categoryId", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">Price (₪)</Label>
                <Input id="price" type="number" step="0.01" {...form.register("price", { valueAsNumber: true })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" {...form.register("imageUrl")} className="mt-1" />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("available")} className="rounded" />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("popular")} className="rounded" />
                Popular
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("newProduct")} className="rounded" />
                New
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save Changes" : "Create Product"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
