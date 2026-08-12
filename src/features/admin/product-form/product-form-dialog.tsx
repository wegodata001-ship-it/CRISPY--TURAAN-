"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  RefreshCw,
  FileText,
  ImageIcon,
  Layers,
  Settings2,
} from "lucide-react";
import { productSchema, type ProductInput } from "@/lib/validation/schemas";
import { translateProductFields } from "@/lib/admin/translate-text";
import {
  subscribeToModifierGroups,
  getProductModifierGroups,
  saveProductEditorChanges,
} from "@/services";
import { uploadProductImage, deleteImageByUrl } from "@/services/storageService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminDialog,
  AdminDialogBody,
  AdminDialogContent,
  AdminDialogFooter,
  AdminDialogHeader,
  AdminDialogTitle,
} from "@/features/admin/components/admin-dialog";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { CategorySearchSelect } from "./category-search-select";
import {
  ProductModifiersPanel,
  type ProductModifiersPanelHandle,
} from "./product-modifiers-panel";
import { ProductImageSection } from "./product-image-section";
import { AdminToastStack, createToast, type AdminToast } from "@/features/admin/components/admin-toast";
import { getRootCategoriesForAdmin, getSubcategories } from "@/lib/menu/category-tree";
import { isAllowedProductImageUrl } from "@/lib/menu/placeholders";
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
import {
  createSavePerfTimer,
  pickChangedProductFields,
} from "./product-save-perf";

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
  const { dir } = useLocale();
  const [tab, setTab] = useState<ProductFormTab>("details");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translating, setTranslating] = useState<"name" | "description" | null>(null);
  const [manualFields, setManualFields] = useState<Set<ManualTranslateField>>(new Set());
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [linkedGroupIds, setLinkedGroupIds] = useState<string[]>([]);
  const [modifierLinks, setModifierLinks] = useState<ProductModifierGroup[]>([]);
  const [allGroups, setAllGroups] = useState<ModifierGroup[]>([]);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranslatedName = useRef("");
  const lastTranslatedDesc = useRef("");
  const initialFormSnapshotRef = useRef<ProductInput | null>(null);
  const initialLinkedGroupIdsRef = useRef<string[]>([]);
  const initialModifierLinksRef = useRef<ProductModifierGroup[]>([]);
  const modifiersPanelRef = useRef<ProductModifiersPanelHandle>(null);
  const saveInFlightRef = useRef(false);

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
        setModifierLinks([]);
        initialLinkedGroupIdsRef.current = [];
        initialModifierLinksRef.current = [];
        initialFormSnapshotRef.current = form.getValues();
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
        imageUrl: product.image && isAllowedProductImageUrl(product.image) ? product.image : "",
        available: product.available,
        popular: product.isPopular,
        newProduct: product.isNew,
        active: product.active,
        sortOrder: product.sortOrder,
      });
      setGalleryUrls(
        product.image && isAllowedProductImageUrl(product.image) ? [product.image] : []
      );
      setSavedProductId(product.id);
      initialFormSnapshotRef.current = form.getValues();
    },
    [categories, form, rootCategories]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTab("details");
    setError(null);
    setTranslateError(null);
    setManualFields(new Set());
    setIsDirty(false);
    setSaveState("idle");
    initialModifierLinksRef.current = [];
    setModifierLinks([]);

    if (editing) {
      resetFormFromProduct(editing, editing.sortOrder);
      setLinkedGroupIds([]);
      initialLinkedGroupIdsRef.current = [];
      getProductModifierGroups(editing.id).then((links) => {
        if (cancelled) return;
        const sorted = [...links].sort((a, b) => a.sortOrder - b.sortOrder);
        const ids = sorted.map((l) => l.groupId);
        setLinkedGroupIds(ids);
        setModifierLinks(sorted);
        initialLinkedGroupIdsRef.current = ids;
        initialModifierLinksRef.current = sorted;
      });
      return () => {
        cancelled = true;
      };
    }

    const draft = loadProductDraft();
    if (draft && !draft.editingId) {
      const restore = confirm(t("admin.productForm.restoreDraft"));
      if (restore) {
        form.reset(draft.values);
        setGalleryUrls(draft.galleryUrls);
        setLinkedGroupIds(draft.linkedGroupIds);
        setModifierLinks([]);
        initialLinkedGroupIdsRef.current = [...draft.linkedGroupIds];
        initialModifierLinksRef.current = [];
        initialFormSnapshotRef.current = draft.values;
        setManualFields(new Set(draft.manualFields));
        return;
      }
      clearProductDraft();
    }

    resetFormFromProduct(null, productsCount + 1);
  }, [open, editing, form, productsCount, resetFormFromProduct, t]);

  useEffect(() => {
    if (!open) return;
    const sub = form.watch(() => setIsDirty(true));
    return () => sub.unsubscribe();
  }, [open, form]);

  const pushToast = useCallback((toast: AdminToast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleLinkedChange = useCallback((ids: string[]) => {
    setLinkedGroupIds(ids);
    setIsDirty(true);
  }, []);

  const handleCloseRequest = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (saving) return;
    if (isDirty && !confirm(t("admin.productForm.unsavedConfirm"))) return;
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    const unsub = subscribeToModifierGroups(setAllGroups, () => {});
    return () => unsub();
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

  const submit = async () => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;

    const perf = createSavePerfTimer();
    perf.mark("SAVE START");

    try {
      perf.mark("Validation");
      const valid = await form.trigger();
      if (!valid) {
        setError(t("admin.productForm.validationError"));
        setTab("details");
        return;
      }

      setSaving(true);
      setSaveState("saving");
      setError(null);

      const formValues = { ...form.getValues(), profit };
      const primaryImage = form.watch("imageUrl") || galleryUrls[0];
      if (primaryImage) formValues.imageUrl = primaryImage;

      const productPatch = pickChangedProductFields(
        formValues,
        initialFormSnapshotRef.current
      );
      const persistId = editing?.id ?? savedProductId;
      const modifierChanges =
        modifiersPanelRef.current?.collectPendingChanges() ?? {
          groupUpdates: [],
          optionUpdates: [],
          optionCreates: [],
          groupCreates: [],
          linkOverrides: [],
          optionOverrides: [],
        };

      perf.mark("Image processing");
      perf.mark("Atomic Firestore commit");
      const result = await saveProductEditorChanges({
        productId: persistId,
        productValues: formValues,
        productPatch,
        existingLinks: modifierLinks,
        desiredGroupIds: linkedGroupIds,
        modifiers: modifierChanges,
      });
      if (!result.success) {
        setSaveState("idle");
        setError(result.error);
        pushToast(createToast(result.error, "error"));
        return;
      }

      clearProductDraft();
      setSavedProductId(result.data.productId);
      const savedGroupIds = [
        ...linkedGroupIds,
        ...result.data.createdGroupIds,
      ];
      setLinkedGroupIds(savedGroupIds);
      setModifierLinks(result.data.links);
      initialFormSnapshotRef.current = formValues;
      initialLinkedGroupIdsRef.current = savedGroupIds;
      initialModifierLinksRef.current = result.data.links;
      modifiersPanelRef.current?.markSaved();
      setSaveState("saved");
      setIsDirty(false);
      pushToast(createToast(t("admin.productForm.saveSuccess")));
      perf.mark("SAVE END");
      onOpenChange(false);
    } catch (err) {
      console.error("[PRODUCT_SAVE_FAILED]", err);
      setSaveState("idle");
      const message =
        err instanceof Error ? err.message : t("admin.productForm.validationError");
      setError(message);
      pushToast(createToast(message, "error"));
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  const handleUploadProductImage = async (file: File, onProgress: (pct: number) => void) => {
    const id = productId ?? `new-${Date.now()}`;
    const result = await uploadProductImage(file, id, onProgress);
    if (result.success && result.data) {
      setIsDirty(true);
    }
    return result;
  };

  const handleImageChange = (url: string) => {
    form.setValue("imageUrl", url);
    setGalleryUrls(url ? [url] : []);
    setIsDirty(true);
  };

  return (
    <AdminDialog open={open} onOpenChange={handleCloseRequest}>
      <AdminDialogContent
        size="product"
        className={cn(
          "h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] rounded-2xl sm:h-[min(85dvh,900px)] sm:max-h-[min(85dvh,900px)] sm:w-[min(900px,calc(100vw-48px))]",
          dir === "rtl" && "[&>button]:left-4 [&>button]:right-auto [&>button]:end-auto"
        )}
      >
        <AdminDialogHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <AdminDialogTitle className="flex items-center gap-2 text-start font-display text-lg sm:text-xl">
            {editing ? t("admin.products.edit") : t("admin.products.new")}
            {isDirty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t("admin.productForm.unsavedChanges")}
              </span>
            )}
            {saveState === "saved" && (
              <span className="text-xs font-medium text-emerald-600">{t("admin.productForm.savedLabel")}</span>
            )}
          </AdminDialogTitle>
        </AdminDialogHeader>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-beige-dark/20 px-3 py-2 sm:px-4 dark:border-white/10">
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

        <AdminDialogBody className="px-4 py-4 sm:px-6 sm:py-5">
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
            <ProductImageSection
              imageUrl={form.watch("imageUrl") || galleryUrls[0] || ""}
              onChange={handleImageChange}
              onUpload={handleUploadProductImage}
              onDelete={deleteImageByUrl}
            />
          )}

          <div className={tab === "modifiers" ? undefined : "hidden"}>
            <ProductModifiersPanel
              ref={modifiersPanelRef}
              productId={productId}
              allGroups={allGroups}
              linkedGroupIds={linkedGroupIds}
              existingLinks={modifierLinks}
              onLinkedChange={handleLinkedChange}
              onDirty={() => setIsDirty(true)}
            />
          </div>

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
        </AdminDialogBody>

        <AdminDialogFooter className="justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-[96px] rounded-xl"
            disabled={saving}
            onClick={() => handleCloseRequest(false)}
          >
            {t("admin.action.cancel")}
          </Button>
          <Button
            type="button"
            className="h-11 min-w-[140px] flex-1 rounded-xl sm:flex-none"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("admin.productForm.saving")}
              </>
            ) : saveState === "saved" ? (
              t("admin.productForm.savedLabel")
            ) : (
              t("admin.productForm.saveChanges")
            )}
          </Button>
        </AdminDialogFooter>
      </AdminDialogContent>
      <AdminToastStack toasts={toasts} onDismiss={dismissToast} />
    </AdminDialog>
  );
}
