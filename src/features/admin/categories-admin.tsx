"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCategories } from "@/hooks/useProducts";
import { createCategory, updateCategory, deleteCategory } from "@/services";
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/features/admin/image-upload";
import { uploadCategoryImage, deleteImageByUrl } from "@/services/storageService";
import type { Category } from "@/types";

export function CategoriesAdmin() {
  const { categories, loading } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { nameAr: "", nameEn: "", icon: "coffee", imageUrl: "", sortOrder: 0, active: true },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ nameAr: "", nameEn: "", icon: "coffee", imageUrl: "", sortOrder: categories.length + 1, active: true });
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-brown">Categories</h1>
          <p className="text-sm text-coffee/60">{categories.length} categories</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between rounded-2xl bg-warm-white p-4 shadow-soft"
            >
              <div>
                <p className="font-medium text-dark-brown">{cat.name_en}</p>
                <p className="text-sm text-coffee/50" dir="rtl">{cat.name_ar}</p>
                <p className="mt-1 text-xs text-coffee/40">Icon: {cat.icon} · Order: {cat.sortOrder}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(cat)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(cat.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Input id="icon" {...form.register("icon")} className="mt-1" placeholder="coffee" />
              </div>
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input id="sortOrder" type="number" {...form.register("sortOrder", { valueAsNumber: true })} className="mt-1" />
              </div>
            </div>
            <ImageUpload
              label="Category Image"
              value={form.watch("imageUrl") ?? ""}
              onChange={(url) => form.setValue("imageUrl", url)}
              onUpload={(file, onProgress) =>
                uploadCategoryImage(file, editing?.id ?? `new-${Date.now()}`, onProgress)
              }
              onDelete={deleteImageByUrl}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("active")} className="rounded" />
              Active
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
