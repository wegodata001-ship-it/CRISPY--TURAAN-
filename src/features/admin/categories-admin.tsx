"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAllCategories, useProducts } from "@/hooks/useProducts";
import { createCategory, updateCategory, deleteCategory, reorderCategories } from "@/services";
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AdminDialog,
  AdminDialogBody,
  AdminDialogContent,
  AdminDialogFooter,
  AdminDialogHeader,
  AdminDialogTitle,
} from "@/features/admin/components/admin-dialog";
import { ImageUpload } from "@/features/admin/image-upload";
import { SortableList } from "@/components/admin/sortable-list";
import { uploadCategoryImage, deleteImageByUrl } from "@/services/storageService";
import { cn } from "@/lib/utils";
import { isAllowedProductImageUrl } from "@/lib/menu/placeholders";
import { useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import {
  countProductsInCategory,
  countProductsInSubcategory,
  getRootCategoriesForAdmin,
} from "@/lib/menu/category-tree";
import type { Category } from "@/types";

const ICONS = ["coffee", "cup-soda", "cake", "salad", "sandwich", "ice-cream", "milk", "star"];

type StatusFilter = "all" | "active" | "hidden";

export function CategoriesAdmin() {
  const t = useT();
  const { categories, loading } = useAllCategories();
  const { products } = useProducts();
  const [editing, setEditing] = useState<Category | null>(null);
  const [viewing, setViewing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const filtered = useMemo(() => {
    const base = ordered.length ? ordered : sorted;
    if (statusFilter === "active") return base.filter((c) => c.active);
    if (statusFilter === "hidden") return base.filter((c) => !c.active);
    return base;
  }, [ordered, sorted, statusFilter]);

  const productCount = (cat: Category) =>
    cat.parentId
      ? countProductsInSubcategory(products, cat.id)
      : countProductsInCategory(products, cat.id, categories);

  const parentOptions = useMemo(
    () => getRootCategoriesForAdmin(categories).filter((c) => c.id !== editing?.id),
    [categories, editing?.id]
  );

  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameHe: "",
      nameAr: "",
      nameEn: "",
      icon: "coffee",
      imageUrl: "",
      color: "#8B6914",
      sortOrder: 0,
      active: true,
      parentId: "",
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      nameHe: "",
      nameAr: "",
      nameEn: "",
      icon: "coffee",
      imageUrl: "",
      color: "#8B6914",
      sortOrder: categories.length + 1,
      active: true,
      parentId: "",
    });
    setError(null);
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    form.reset({
      nameHe: cat.name_he,
      nameAr: cat.name_ar,
      nameEn: cat.name_en,
      icon: cat.icon,
      imageUrl: cat.image || undefined,
      color: cat.color,
      sortOrder: cat.sortOrder,
      active: cat.active,
      parentId: cat.parentId ?? "",
    });
    setError(null);
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    setError(null);
    const payload = {
      ...data,
      parentId: data.parentId?.trim() ? data.parentId : undefined,
    };
    const result = editing
      ? await updateCategory(editing.id, payload)
      : await createCategory(payload);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
  });

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.categories.deleteConfirm"))) return;
    await deleteCategory(id);
  };

  const toggleActive = async (cat: Category) => {
    if (togglingId) return;
    setTogglingId(cat.id);
    await updateCategory(cat.id, { active: !cat.active });
    setTogglingId(null);
  };

  const handleReorder = async (items: Category[]) => {
    setOrdered(items);
    await reorderCategories(items.map((c) => c.id));
  };

  const filterOptions: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t("admin.categories.filterAll") },
    { id: "active", label: t("admin.categories.filterActive") },
    { id: "hidden", label: t("admin.categories.filterHidden") },
  ];

  const renderCategoryCard = (cat: Category, dragHandle: React.ReactNode) => {
    const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
    return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-3 rounded-2xl p-4 shadow-soft transition-colors",
        cat.parentId && "ms-4 border-s-2 border-turquoise/25",
        cat.active
          ? "bg-warm-white dark:bg-white/5"
          : "bg-beige/50 opacity-55 dark:bg-white/[0.03]"
      )}
    >
      {dragHandle}
      <div
        className={cn(
          "h-12 w-12 shrink-0 overflow-hidden rounded-xl",
          !cat.active && "grayscale"
        )}
        style={{ backgroundColor: cat.active ? cat.color : "#9ca3af" }}
      >
        {cat.image && isAllowedProductImageUrl(cat.image) ? (
          <Image
            src={cat.image}
            alt={cat.name_en}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-white/90">
            {cat.icon.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "font-medium",
              cat.active
                ? "text-dark-brown dark:text-warm-white"
                : "text-coffee/50 dark:text-warm-white/50"
            )}
          >
            {cat.name_en}
          </p>
          {!cat.active && (
            <Badge variant="cancelled">{t("admin.categories.hiddenBadge")}</Badge>
          )}
          {parent && (
            <Badge variant="outline" className="text-xs">
              ↳ {parent.name_he}
            </Badge>
          )}
          <Badge variant="outline">
            {productCount(cat)} {t("admin.products")}
          </Badge>
        </div>
        <p className="text-sm text-coffee/50" dir="rtl">
          {cat.name_he}
        </p>
        <p className="mt-0.5 text-xs text-coffee/40">{cat.icon} · #{cat.sortOrder}</p>
      </div>

      <button
        type="button"
        onClick={() => void toggleActive(cat)}
        disabled={togglingId === cat.id}
        title={cat.active ? t("admin.categories.deactivate") : t("admin.categories.activate")}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
          cat.active
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400"
        )}
      >
        {togglingId === cat.id ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              cat.active ? "bg-emerald-500" : "bg-gray-400"
            )}
          />
        )}
        {cat.active ? t("admin.status.active") : t("admin.status.inactive")}
      </button>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setViewing(cat)}
          title={t("admin.action.view")}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => openEdit(cat)}
          title={t("admin.action.edit")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleDelete(cat.id)}
          title={t("admin.action.delete")}
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>
    </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.categories.title")}
        subtitle={`${t("admin.banners.dragHint")} · ${categories.length} ${t("admin.categories")}`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("admin.categories.new")}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStatusFilter(opt.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              statusFilter === opt.id
                ? "bg-turquoise text-warm-white"
                : "bg-beige/60 text-coffee hover:bg-beige dark:bg-white/10 dark:text-warm-white/80"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-beige-dark/30 py-12 text-center text-sm text-coffee/50">
          {t("admin.categories.noResults")}
        </p>
      ) : statusFilter === "all" ? (
        <SortableList
          className="space-y-3"
          items={filtered}
          onReorder={handleReorder}
          renderItem={(cat, dragHandle) => renderCategoryCard(cat, dragHandle)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((cat) => (
            <div key={cat.id}>{renderCategoryCard(cat, null)}</div>
          ))}
        </div>
      )}

      {/* View-only dialog — no data changes */}
      <AdminDialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <AdminDialogContent size="sm">
          <AdminDialogHeader>
            <AdminDialogTitle>{t("admin.categories.viewTitle")}</AdminDialogTitle>
          </AdminDialogHeader>
          <AdminDialogBody>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-4">
                <div
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-xl"
                  style={{ backgroundColor: viewing.color }}
                >
                  {viewing.image && isAllowedProductImageUrl(viewing.image) ? (
                    <Image
                      src={viewing.image}
                      alt={viewing.name_en}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl text-white/90">
                      {viewing.icon.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-lg font-semibold dark:text-warm-white">{viewing.name_en}</p>
                  <Badge variant={viewing.active ? "ready" : "cancelled"}>
                    {viewing.active ? t("admin.status.active") : t("admin.categories.hiddenBadge")}
                  </Badge>
                </div>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-coffee/45">{t("admin.categoryNameHe")}</dt>
                  <dd className="font-medium dark:text-warm-white" dir="rtl">
                    {viewing.name_he}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-coffee/45">{t("admin.categoryNameAr")}</dt>
                  <dd className="font-medium dark:text-warm-white" dir="rtl">
                    {viewing.name_ar}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-coffee/45">{t("admin.categoryNameEn")}</dt>
                  <dd className="font-medium dark:text-warm-white">{viewing.name_en}</dd>
                </div>
                <div>
                  <dt className="text-xs text-coffee/45">{t("admin.categories.icon")}</dt>
                  <dd className="font-medium dark:text-warm-white">{viewing.icon}</dd>
                </div>
                <div>
                  <dt className="text-xs text-coffee/45">{t("admin.categories.color")}</dt>
                  <dd className="flex items-center gap-2 font-medium dark:text-warm-white">
                    <span
                      className="inline-block h-4 w-4 rounded border border-beige-dark/30"
                      style={{ backgroundColor: viewing.color }}
                    />
                    {viewing.color}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-coffee/45">{t("admin.categories.sortOrder")}</dt>
                  <dd className="font-medium dark:text-warm-white">{viewing.sortOrder}</dd>
                </div>
                <div>
                  <dt className="text-xs text-coffee/45">{t("admin.products")}</dt>
                  <dd className="font-medium dark:text-warm-white">
                    {productCount(viewing)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
          </AdminDialogBody>
        </AdminDialogContent>
      </AdminDialog>

      <AdminDialog open={open} onOpenChange={setOpen}>
        <AdminDialogContent size="md">
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <AdminDialogHeader>
            <AdminDialogTitle>
              {editing ? t("admin.categories.edit") : t("admin.categories.new")}
            </AdminDialogTitle>
          </AdminDialogHeader>
          <AdminDialogBody className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee/45">
                {t("admin.categories.namesSection")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="nameHe">{t("admin.categoryNameHe")}</Label>
                  <Input id="nameHe" dir="rtl" {...form.register("nameHe")} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="nameAr">{t("admin.categoryNameAr")}</Label>
                  <Input id="nameAr" dir="rtl" {...form.register("nameAr")} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="nameEn">{t("admin.categoryNameEn")}</Label>
                  <Input id="nameEn" {...form.register("nameEn")} className="mt-1" />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee/45">
                {t("admin.categories.settingsSection")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="parentId">{t("admin.categories.parentCategory")}</Label>
                  <select
                    id="parentId"
                    {...form.register("parentId")}
                    className="mt-1 h-10 w-full rounded-xl border border-beige-dark/30 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5"
                  >
                    <option value="">{t("admin.categories.rootCategory")}</option>
                    {parentOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_he || c.name_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="icon">{t("admin.categories.icon")}</Label>
                  <select
                    id="icon"
                    {...form.register("icon")}
                    className="mt-1 h-10 w-full rounded-xl border border-beige-dark/30 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5"
                  >
                    {ICONS.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="color">{t("admin.categories.color")}</Label>
                  <Input id="color" type="color" {...form.register("color")} className="mt-1 h-10 p-1" />
                </div>
                <div>
                  <Label htmlFor="sortOrder">{t("admin.categories.sortOrder")}</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    {...form.register("sortOrder", { valueAsNumber: true })}
                    className="mt-1"
                  />
                </div>
              </div>
            </section>

            <ImageUpload
              compact
              label={t("admin.categories.coverImage")}
              value={form.watch("imageUrl") ?? ""}
              onChange={(url) => form.setValue("imageUrl", url)}
              onUpload={(file, onProgress) =>
                uploadCategoryImage(file, editing?.id ?? `new-${Date.now()}`, onProgress)
              }
              onDelete={deleteImageByUrl}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("active")} className="rounded" />
              {t("admin.categories.visibleInCatalog")}
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </AdminDialogBody>
          <AdminDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t("admin.action.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                t("admin.action.save")
              ) : (
                t("admin.action.create")
              )}
            </Button>
          </AdminDialogFooter>
          </form>
        </AdminDialogContent>
      </AdminDialog>
    </div>
  );
}
