"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCategories, useProducts } from "@/hooks/useProducts";
import { createCategory, updateCategory, deleteCategory, reorderCategories } from "@/services";
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "@/features/admin/image-upload";
import { SortableList } from "@/components/admin/sortable-list";
import { uploadCategoryImage, deleteImageByUrl } from "@/services/storageService";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const ICONS = ["coffee", "cup-soda", "cake", "salad", "sandwich", "ice-cream", "milk", "star"];

export function CategoriesAdmin() {
  const { categories, loading } = useCategories();
  const { products } = useProducts();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<Category[]>([]);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const displayList = ordered.length ? ordered : sorted;

  const productCount = (catId: string) =>
    products.filter((p) => p.categoryId === catId).length;

  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameAr: "",
      nameEn: "",
      icon: "coffee",
      imageUrl: "",
      color: "#8B6914",
      sortOrder: 0,
      active: true,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      nameAr: "",
      nameEn: "",
      icon: "coffee",
      imageUrl: "",
      color: "#8B6914",
      sortOrder: categories.length + 1,
      active: true,
    });
    setError(null);
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    form.reset({
      nameAr: cat.name_ar,
      nameEn: cat.name_en,
      icon: cat.icon,
      imageUrl: cat.image || undefined,
      color: cat.color,
      sortOrder: cat.sortOrder,
      active: cat.active,
    });
    setError(null);
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    setError(null);
    const result = editing
      ? await updateCategory(editing.id, data)
      : await createCategory(data);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    await deleteCategory(id);
  };

  const toggleActive = async (cat: Category) => {
    await updateCategory(cat.id, { active: !cat.active });
  };

  const handleReorder = async (items: Category[]) => {
    setOrdered(items);
    await reorderCategories(items.map((c) => c.id));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-brown dark:text-warm-white">
            Categories
          </h1>
          <p className="text-sm text-coffee/60">Drag to reorder · {categories.length} categories</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <SortableList
          className="mt-6 space-y-3"
          items={displayList}
          onReorder={handleReorder}
          renderItem={(cat, dragHandle) => (
            <motion.div
              layout
              className={cn(
                "flex items-center gap-3 rounded-2xl bg-warm-white p-4 shadow-soft dark:bg-white/5",
                !cat.active && "opacity-60"
              )}
            >
              {dragHandle}
              <div
                className="h-12 w-12 shrink-0 overflow-hidden rounded-xl"
                style={{ backgroundColor: cat.color }}
              >
                {cat.image ? (
                  <Image src={cat.image} alt={cat.name_en} width={48} height={48} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg text-white/90">
                    {cat.icon.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-dark-brown dark:text-warm-white">{cat.name_en}</p>
                  {!cat.active && <Badge variant="cancelled">Hidden</Badge>}
                  <Badge variant="outline">{productCount(cat.id)} products</Badge>
                </div>
                <p className="text-sm text-coffee/50" dir="rtl">{cat.name_ar}</p>
                <p className="mt-0.5 text-xs text-coffee/40">{cat.icon} · #{cat.sortOrder}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(cat)} title={cat.active ? "Hide" : "Show"}>
                  {cat.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(cat)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(cat.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            </motion.div>
          )}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nameEn">English Name</Label>
                <Input id="nameEn" {...form.register("nameEn")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="nameAr">Arabic Name</Label>
                <Input id="nameAr" dir="rtl" {...form.register("nameAr")} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="icon">Icon</Label>
                <select
                  id="icon"
                  {...form.register("icon")}
                  className="mt-1 h-10 w-full rounded-xl border border-beige-dark/30 bg-warm-white px-3 text-sm dark:border-white/10 dark:bg-white/5"
                >
                  {ICONS.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input id="color" type="color" {...form.register("color")} className="mt-1 h-10 p-1" />
              </div>
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input id="sortOrder" type="number" {...form.register("sortOrder", { valueAsNumber: true })} className="mt-1" />
              </div>
            </div>
            <ImageUpload
              label="Cover Image"
              value={form.watch("imageUrl") ?? ""}
              onChange={(url) => form.setValue("imageUrl", url)}
              onUpload={(file, onProgress) =>
                uploadCategoryImage(file, editing?.id ?? `new-${Date.now()}`, onProgress)
              }
              onDelete={deleteImageByUrl}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("active")} className="rounded" />
              Visible in catalog
            </label>
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
