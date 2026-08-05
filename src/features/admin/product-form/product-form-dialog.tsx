"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  RefreshCw,
  FileText,
  ImageIcon,
  Layers,
  Settings2,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { productSchema, type ProductInput } from "@/lib/validation/schemas";
import { translateProductFields } from "@/lib/admin/translate-text";
import {
  createProduct,
  updateProduct,
  getModifierGroups,
  getProductModifierGroups,
  linkProductModifierGroup,
  unlinkProductModifierGroup,
} from "@/services";
import { uploadProductImage, deleteImageByUrl } from "@/services/storageService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { CategorySearchSelect } from "./category-search-select";
import { getRootCategoriesForAdmin, getSubcategories } from "@/lib/menu/category-tree";
import {
  calcProfitMetrics,
  clearProductDraft,
  DEFAULT_PRODUCT_VALUES,
  loadProductDraft,
  saveProductDraft,
  type ManualTranslateField,
  type ProductFormTab,
} from "./product-form-types";
import type { Category, Product } from "@/types";
import type { ModifierGroup, ProductModifierGroup } from "@/types/modifiers";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Product | null;
  categories: Category[];
  productsCount: number;
  onDuplicate?: (product: Product) => void;
}

const TABS: { id: ProductFormTab; icon: typeof FileText; labelKey: string }[] = [
  { id: "details", icon: FileText, labelKey: "admin.productForm.tabDetails" },
  { id: "images", icon: ImageIcon, labelKey: "admin.productForm.tabImages" },
  { id: "modifiers", icon: Layers, labelKey: "admin.productForm.tabModifiers" },
  { id: "settings", icon: Settings2, labelKey: "admin.productForm.tabSettings" },
];

export function ProductFormDialog({
  open,
  onOpenChange,
  editing,
  categories,
  productsCount,
  onDuplicate,
}: ProductFormDialogProps) {
  const t = useT();
  const [tab, setTab] = useState<ProductFormTab>("details");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translating, setTranslating] = useState<"name" | "description" | null>(null);
  const [manualFields, setManualFields] = useState<Set<ManualTranslateField>>(new Set());
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [linkedGroupIds, setLinkedGroupIds] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<ModifierGroup[]>([]);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranslatedName = useRef("");
  const lastTranslatedDesc = useRef("");

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as Resolver<ProductInput>,
    defaultValues: DEFAULT_PRODUCT_VALUES,
  });

  const price = form.watch("price");
  const cost = form.watch("cost");
  const rootCategories = useMemo(
    () => getRootCategoriesForAdmin(categories),
    [categories]
  );
  const watchedCategoryId = form.watch("categoryId");
  const subcategories = useMemo(
    () => (watchedCategoryId ? getSubcategories(categories, watchedCategoryId) : []),
    [categories, watchedCategoryId]
  );

  const { profit, marginPercent } = useMemo(
    () => calcProfitMetrics(Number(price) || 0, Number(cost) || 0),
    [price, cost]
  );

  useEffect(() => {
    form.setValue("profit", profit);
  }, [profit, form]);

  const productId = editing?.id ?? savedProductId;

  const resetFormFromProduct = useCallback(
    (product: Product | null, sortOrder: number) => {
      if (!product) {
        form.reset({
          ...DEFAULT_PRODUCT_VALUES,
          categoryId: rootCategories[0]?.id ?? categories[0]?.id ?? "",
          sortOrder,
        });
        setGalleryUrls([]);
        setLinkedGroupIds([]);
        setSavedProductId(null);
        return;
      }
      form.reset({
        nameHe: product.name_he,
        nameAr: product.name_ar,
        nameEn: product.name_en,
        descriptionHe: product.description_he,
        descriptionAr: product.description_ar,
        descriptionEn: product.description_en,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId ?? null,
        price: product.price,
        cost: product.cost,
        profit: product.profit,
        businessType: product.businessType,
        imageUrl: product.image,
        available: product.available,
        popular: product.isPopular,
        newProduct: product.isNew,
        active: product.active,
        sortOrder: product.sortOrder,
      });
      setGalleryUrls(product.image ? [product.image] : []);
      setSavedProductId(product.id);
    },
    [categories, form, rootCategories]
  );

  useEffect(() => {
    if (!open) return;
    setTab("details");
    setError(null);
    setTranslateError(null);
    setManualFields(new Set());

    if (editing) {
      resetFormFromProduct(editing, editing.sortOrder);
      getProductModifierGroups(editing.id).then((links: ProductModifierGroup[]) => {
        setLinkedGroupIds(links.map((l) => l.groupId));
      });
      return;
    }

    const draft = loadProductDraft();
    if (draft && !draft.editingId) {
      const restore = confirm(t("admin.productForm.restoreDraft"));
      if (restore) {
        form.reset(draft.values);
        setGalleryUrls(draft.galleryUrls);
        setLinkedGroupIds(draft.linkedGroupIds);
        setManualFields(new Set(draft.manualFields));
        return;
      }
      clearProductDraft();
    }

    resetFormFromProduct(null, productsCount + 1);
  }, [open, editing, form, productsCount, resetFormFromProduct, t]);

  useEffect(() => {
    if (!open) return;
    getModifierGroups().then(setAllGroups);
  }, [open]);

  const persistDraft = useCallback(() => {
    if (editing) return;
    const values = form.getValues();
    saveProductDraft({
      values,
      galleryUrls,
      linkedGroupIds,
      manualFields: [...manualFields],
      editingId: null,
      savedAt: new Date().toISOString(),
    });
  }, [editing, form, galleryUrls, linkedGroupIds, manualFields]);

  useEffect(() => {
    if (!open || editing) return;
    const sub = form.watch(() => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(persistDraft, 800);
    });
    return () => sub.unsubscribe();
  }, [open, editing, form, persistDraft]);

  const markManual = (field: ManualTranslateField) => {
    setManualFields((prev) => new Set(prev).add(field));
  };

  const runNameTranslation = async (force = false) => {
    const nameHe = form.getValues("nameHe").trim();
    if (!nameHe || nameHe === lastTranslatedName.current) return;

    setTranslating("name");
    setTranslateError(null);
    const { ar, en, errors } = await translateProductFields(nameHe);
    setTranslating(null);

    if (errors.length) {
      setTranslateError(t("admin.productForm.translateFailed"));
    }

    if (ar && (force || !manualFields.has("nameAr"))) form.setValue("nameAr", ar);
    if (en && (force || !manualFields.has("nameEn"))) form.setValue("nameEn", en);
    lastTranslatedName.current = nameHe;
  };

  const runDescriptionTranslation = async (force = false) => {
    const descriptionHe = form.getValues("descriptionHe").trim();
    if (!descriptionHe || descriptionHe === lastTranslatedDesc.current) return;

    setTranslating("description");
    setTranslateError(null);
    const { ar, en, errors } = await translateProductFields(descriptionHe);
    setTranslating(null);

    if (errors.length) {
      setTranslateError(t("admin.productForm.translateFailed"));
    }

    if (ar && (force || !manualFields.has("descriptionAr"))) form.setValue("descriptionAr", ar);
    if (en && (force || !manualFields.has("descriptionEn"))) form.setValue("descriptionEn", en);
    lastTranslatedDesc.current = descriptionHe;
  };

  const retranslate = async (
    kind: "name" | "description",
    fields: ManualTranslateField[]
  ) => {
    const hasManual = fields.some((f) => manualFields.has(f));
    if (hasManual && !confirm(t("admin.productForm.retranslateConfirm"))) return;
    if (kind === "name") await runNameTranslation(true);
    else await runDescriptionTranslation(true);
    setManualFields((prev) => {
      const next = new Set(prev);
      fields.forEach((f) => next.delete(f));
      return next;
    });
  };

  const syncModifierLinks = async (pid: string) => {
    const existing = await getProductModifierGroups(pid);
    const existingIds = new Set(existing.map((l: ProductModifierGroup) => l.groupId));
    const desired = new Set(linkedGroupIds);

    for (const link of existing) {
      if (!desired.has(link.groupId)) {
        await unlinkProductModifierGroup(link.id);
      }
    }

    let order = 1;
    for (const groupId of linkedGroupIds) {
      if (!existingIds.has(groupId)) {
        await linkProductModifierGroup({
          productId: pid,
          groupId,
          sortOrder: order,
          active: true,
        });
      }
      order += 1;
    }
  };

  const submit = async (mode: "close" | "continue") => {
    const valid = await form.trigger();
    if (!valid) {
      setError(t("admin.productForm.validationError"));
      return;
    }

    setSaving(true);
    setError(null);
    const data = { ...form.getValues(), profit };
    if (galleryUrls[0]) data.imageUrl = galleryUrls[0];

    const persistId = editing?.id ?? savedProductId;

    const result = persistId
      ? await updateProduct(persistId, data)
      : await createProduct(data);

    if (!result.success) {
      setSaving(false);
      setError(result.error);
      return;
    }

    if (!persistId) {
      setSavedProductId(result.data.id);
    }

    await syncModifierLinks(result.data.id);
    clearProductDraft();
    setSaving(false);

    if (mode === "close") {
      onOpenChange(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    const id = productId ?? `new-${Date.now()}`;
    const result = await uploadProductImage(file, id, () => {});
    if (result.success && result.data) {
      setGalleryUrls((prev) => [...prev, result.data!]);
      if (!form.getValues("imageUrl")) form.setValue("imageUrl", result.data);
    }
  };

  const removeImage = async (url: string, index: number) => {
    if (!confirm(t("admin.productForm.deleteImageConfirm"))) return;
    await deleteImageByUrl(url);
    setGalleryUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      form.setValue("imageUrl", next[0] ?? "");
      return next;
    });
  };

  const setPrimaryImage = (index: number) => {
    setGalleryUrls((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [img] = next.splice(index, 1);
      next.unshift(img);
      form.setValue("imageUrl", next[0]);
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setLinkedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[85vw] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-beige-dark/20 px-6 py-4 dark:border-white/10">
          <DialogTitle className="text-start font-display text-xl">
            {editing ? t("admin.products.edit") : t("admin.products.new")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-beige-dark/20 px-4 py-2 dark:border-white/10">
          {TABS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                tab === id
                  ? "bg-coffee text-warm-white dark:bg-turquoise"
                  : "text-coffee/70 hover:bg-beige/40 dark:text-warm-white/70 dark:hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {translateError && (
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {translateError}
            </p>
          )}

          {tab === "details" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label>{t("admin.productForm.nameHeRequired")}</Label>
                  <Input
                    dir="rtl"
                    {...form.register("nameHe")}
                    className="mt-1 rounded-xl"
                    onBlur={() => void runNameTranslation()}
                  />
                  {translating === "name" && (
                    <p className="mt-1 text-xs text-turquoise">{t("admin.productForm.translating")}</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>{t("admin.productNameAr")}</Label>
                      <button
                        type="button"
                        onClick={() => void retranslate("name", ["nameAr"])}
                        className="rounded-lg p-1 text-coffee/50 hover:bg-beige/40"
                        title={t("admin.productForm.retranslate")}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      dir="rtl"
                      {...form.register("nameAr", { onChange: () => markManual("nameAr") })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>{t("admin.productNameEn")}</Label>
                      <button
                        type="button"
                        onClick={() => void retranslate("name", ["nameEn"])}
                        className="rounded-lg p-1 text-coffee/50 hover:bg-beige/40"
                        title={t("admin.productForm.retranslate")}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      {...form.register("nameEn", { onChange: () => markManual("nameEn") })}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label>{t("admin.productForm.descHeRequired")}</Label>
                  <Textarea
                    dir="rtl"
                    rows={3}
                    {...form.register("descriptionHe")}
                    className="mt-1 rounded-xl"
                    onBlur={() => void runDescriptionTranslation()}
                  />
                  {translating === "description" && (
                    <p className="mt-1 text-xs text-turquoise">{t("admin.productForm.translating")}</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>{t("admin.descAr")}</Label>
                      <button
                        type="button"
                        onClick={() => void retranslate("description", ["descriptionAr"])}
                        className="rounded-lg p-1 text-coffee/50 hover:bg-beige/40"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Textarea
                      dir="rtl"
                      rows={3}
                      {...form.register("descriptionAr", { onChange: () => markManual("descriptionAr") })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>{t("admin.descEn")}</Label>
                      <button
                        type="button"
                        onClick={() => void retranslate("description", ["descriptionEn"])}
                        className="rounded-lg p-1 text-coffee/50 hover:bg-beige/40"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Textarea
                      rows={3}
                      {...form.register("descriptionEn", { onChange: () => markManual("descriptionEn") })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>{t("admin.products.category")}</Label>
                  <div className="mt-1">
                    <CategorySearchSelect
                      categories={rootCategories}
                      value={form.watch("categoryId")}
                      onChange={(id) => {
                        form.setValue("categoryId", id);
                        form.setValue("subcategoryId", null);
                      }}
                      placeholder={t("admin.productForm.searchCategory")}
                      emptyLabel={t("admin.table.noResults")}
                    />
                  </div>
                </div>

                {subcategories.length > 0 && (
                  <div>
                    <Label htmlFor="subcategoryId">{t("admin.products.subcategory")}</Label>
                    <select
                      id="subcategoryId"
                      value={form.watch("subcategoryId") ?? ""}
                      onChange={(e) =>
                        form.setValue("subcategoryId", e.target.value || null)
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-beige-dark/30 bg-warm-white px-3 text-sm dark:border-white/10 dark:bg-white/5"
                    >
                      <option value="">{t("admin.products.noSubcategory")}</option>
                      {subcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name_he || sub.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("admin.products.price")} (₪)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("price", { valueAsNumber: true })}
                      className="mt-1 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>{t("admin.products.cost")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("cost", { valueAsNumber: true })}
                      className="mt-1 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-beige/30 p-4 dark:bg-white/5">
                  <div>
                    <p className="text-xs text-coffee/50">{t("admin.products.profit")}</p>
                    <p className="text-lg font-bold text-turquoise">₪{profit.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-coffee/50">{t("admin.productForm.marginPercent")}</p>
                    <p className="text-lg font-bold text-gold">{marginPercent.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "images" && (
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-beige-dark/40 py-8 transition-colors hover:border-turquoise/50 hover:bg-beige/20 dark:border-white/10">
                <Plus className="h-5 w-5 text-coffee/40" />
                <span className="text-sm text-coffee/60">{t("admin.upload.clickToUpload")}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadImage(file);
                    e.target.value = "";
                  }}
                />
              </label>

              {galleryUrls.length === 0 ? (
                <p className="text-center text-sm text-coffee/50">{t("admin.productForm.noImages")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {galleryUrls.map((url, i) => (
                    <div
                      key={url}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border bg-warm-white shadow-soft dark:bg-[#1a1412]",
                        i === 0 ? "border-turquoise ring-2 ring-turquoise/20" : "border-beige-dark/20 dark:border-white/10"
                      )}
                    >
                      <div className="relative aspect-square">
                        <Image src={url} alt="" fill className="object-cover" sizes="120px" />
                        {i === 0 && (
                          <span className="absolute start-1.5 top-1.5 rounded bg-turquoise px-1.5 py-0.5 text-[9px] text-white">
                            {t("admin.productForm.primaryImage")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-1 p-2">
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(i)}
                            className="rounded-lg p-1.5 text-[10px] hover:bg-beige/40"
                            title={t("admin.productForm.setPrimary")}
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void removeImage(url, i)}
                          className="rounded-lg p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "modifiers" && (
            <div className="space-y-3">
              {!productId && (
                <p className="rounded-xl bg-beige/30 px-4 py-3 text-sm text-coffee/70 dark:bg-white/5">
                  {t("admin.productForm.modifiersAfterSave")}
                </p>
              )}
              {allGroups.length === 0 ? (
                <p className="text-sm text-coffee/50">{t("admin.table.empty")}</p>
              ) : (
                allGroups.map((group) => {
                  const checked = linkedGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                        checked
                          ? "border-turquoise/40 bg-turquoise/5"
                          : "border-beige-dark/20 hover:bg-beige/20 dark:border-white/10"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroup(group.id)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium dark:text-warm-white" dir="rtl">
                        {group.name_he || group.name_ar}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          )}

          {tab === "settings" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-beige-dark/20 px-4 py-3 dark:border-white/10">
                <input type="checkbox" {...form.register("active")} className="rounded" />
                <span className="text-sm">{t("admin.status.active")}</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-beige-dark/20 px-4 py-3 dark:border-white/10">
                <input
                  type="checkbox"
                  checked={!form.watch("active")}
                  onChange={(e) => form.setValue("active", !e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">{t("admin.productForm.hidden")}</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-beige-dark/20 px-4 py-3 dark:border-white/10">
                <input type="checkbox" {...form.register("available")} className="rounded" />
                <span className="text-sm">{t("admin.status.available")}</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-beige-dark/20 px-4 py-3 dark:border-white/10">
                <input type="checkbox" {...form.register("popular")} className="rounded" />
                <span className="text-sm">{t("admin.products.popular")}</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-beige-dark/20 px-4 py-3 dark:border-white/10">
                <input type="checkbox" {...form.register("newProduct")} className="rounded" />
                <span className="text-sm">{t("admin.products.newBadge")}</span>
              </label>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-beige-dark/20 px-6 py-4 dark:border-white/10">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {t("admin.action.cancel")}
          </Button>
          <div className="flex flex-wrap gap-2">
            {editing && onDuplicate && (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onDuplicate(editing)}
              >
                {t("admin.action.duplicate")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={saving}
              onClick={() => void submit("continue")}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.productForm.saveContinue")}
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={saving}
              onClick={() => void submit("close")}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.action.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
