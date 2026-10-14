"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminCard } from "@/features/admin/components/admin-card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminEmptyState } from "@/features/admin/components/admin-empty-state";
import { ProductImage } from "@/components/catalog/product-image";
import { useAuth } from "@/components/providers/auth-provider";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useProducts } from "@/hooks/useProducts";
import { useCostingSettings, useIngredients, useProductRecipes } from "@/hooks/useCosting";
import { canManageCosting } from "@/lib/auth/roles";
import { calculateDishCost, foodCostTone } from "@/lib/costing/calculate";
import { formatPrice, cn } from "@/lib/utils";
import {
  createIngredient,
  deleteIngredient,
  saveCostingSettings,
  saveProductRecipe,
  updateIngredient,
} from "@/services/costingService";
import { updateProduct } from "@/services/productService";
import {
  COSTING_UNITS,
  INGREDIENT_CATEGORIES,
  type CostingUnit,
  type Ingredient,
  type IngredientCategory,
  type RecipeIngredientLine,
} from "@/types/costing";
import type { Product } from "@/types";
import {
  IngredientFormDialog,
  formatIngredientUnitCost,
  type IngredientDraft,
} from "./ingredient-form-dialog";

type Tab = "ingredients" | "recipes" | "analysis";
type SortKey = "profitHigh" | "profitLow" | "foodHigh" | "foodLow";

function toneClass(tone: ReturnType<typeof foodCostTone>) {
  if (tone === "green") return "text-[#2E9B55]";
  if (tone === "yellow") return "text-[#B8860B]";
  if (tone === "red") return "text-[#D71920]";
  return "text-coffee/70";
}

function LocalizedProductName({ product }: { product: Product }) {
  const localized = useLocalizedProduct(product);
  return <span dir={localized.dir}>{localized.name}</span>;
}

export function CostingAdmin() {
  const t = useT();
  const { user } = useAuth();
  const canWrite = canManageCosting(user?.role ?? "");
  const { products, loading: productsLoading } = useProducts();
  const { ingredients, loading: ingredientsLoading } = useIngredients();
  const { byProductId } = useProductRecipes();
  const { settings } = useCostingSettings();

  const [tab, setTab] = useState<Tab>("ingredients");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [analysisSort, setAnalysisSort] = useState<SortKey>("profitHigh");
  const [targetPct, setTargetPct] = useState("30");

  useEffect(() => {
    if (settings.targetFoodCost) {
      setTargetPct(String(Math.round(settings.targetFoodCost * 100)));
    }
  }, [settings.targetFoodCost]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const selectedRecipe = selectedProductId ? byProductId.get(selectedProductId) ?? null : null;

  const liveSettings = useMemo(
    () => ({
      ...settings,
      targetFoodCost: Math.min(0.9, Math.max(0.05, (Number(targetPct) || 30) / 100)),
    }),
    [settings, targetPct]
  );

  const dish = selectedProduct
    ? calculateDishCost({
        productId: selectedProduct.id,
        sellingPrice: selectedProduct.price,
        recipe: selectedRecipe,
        ingredients,
        settings: liveSettings,
      })
    : null;

  const filteredIngredients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ingredients.filter((item) => {
      const matchesSearch = !q || item.name.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory && item.active;
    });
  }, [ingredients, search, categoryFilter]);

  const analysisRows = useMemo(() => {
    const rows = products.map((product) => {
      const breakdown = calculateDishCost({
        productId: product.id,
        sellingPrice: product.price,
        recipe: byProductId.get(product.id) ?? null,
        ingredients,
        settings: liveSettings,
      });
      return { product, breakdown };
    });
    rows.sort((a, b) => {
      if (analysisSort === "profitHigh") return b.breakdown.grossProfit - a.breakdown.grossProfit;
      if (analysisSort === "profitLow") return a.breakdown.grossProfit - b.breakdown.grossProfit;
      if (analysisSort === "foodHigh")
        return (b.breakdown.foodCostPercentage ?? -1) - (a.breakdown.foodCostPercentage ?? -1);
      return (a.breakdown.foodCostPercentage ?? 999) - (b.breakdown.foodCostPercentage ?? 999);
    });
    return rows;
  }, [products, byProductId, ingredients, liveSettings, analysisSort]);

  const saveDraft = async (draft: IngredientDraft) => {
    const payload = {
      name: draft.name,
      category: draft.category,
      purchaseQuantity: draft.purchaseQuantity,
      purchaseUnit: draft.purchaseUnit,
      purchasePrice: draft.purchasePrice,
      supplierId: draft.supplierId || undefined,
      notes: draft.notes || undefined,
    };
    if (editing) {
      await updateIngredient(editing.id, payload, editing);
    } else {
      await createIngredient(payload);
    }
  };

  const persistRecipe = async (lines: RecipeIngredientLine[]) => {
    if (!selectedProductId || !canWrite) return;
    await saveProductRecipe(selectedProductId, lines);
  };

  const addIngredientToRecipe = async (ingredientId: string) => {
    const ingredient = ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) return;
    const current = selectedRecipe?.ingredients ?? [];
    if (current.some((line) => line.ingredientId === ingredientId)) return;
    await persistRecipe([
      ...current,
      { ingredientId, quantity: ingredient.baseUnit === "unit" ? 1 : 100, unit: ingredient.baseUnit },
    ]);
  };

  const updateLine = async (index: number, patch: Partial<RecipeIngredientLine>) => {
    const current = [...(selectedRecipe?.ingredients ?? [])];
    current[index] = { ...current[index]!, ...patch };
    await persistRecipe(current);
  };

  const removeLine = async (index: number) => {
    const current = (selectedRecipe?.ingredients ?? []).filter((_, i) => i !== index);
    await persistRecipe(current);
  };

  const applyRecommended = async () => {
    if (!canWrite || !selectedProduct || !dish?.recommendedPrice) return;
    if (!window.confirm(t("admin.costing.applyConfirm"))) return;
    await updateProduct(selectedProduct.id, {
      price: dish.recommendedPrice,
      profit: Math.round((dish.recommendedPrice - dish.totalCost) * 100) / 100,
    });
  };

  const persistTarget = async (pct: string) => {
    setTargetPct(pct);
    if (!canWrite) return;
    const ratio = Math.min(0.9, Math.max(0.05, (Number(pct) || 30) / 100));
    await saveCostingSettings({
      targetFoodCost: ratio,
      greenMax: settings.greenMax,
      yellowMax: settings.yellowMax,
    });
  };

  const tabs: { id: Tab; key: string }[] = [
    { id: "ingredients", key: "admin.costing.tab.ingredients" },
    { id: "recipes", key: "admin.costing.tab.recipes" },
    { id: "analysis", key: "admin.costing.tab.analysis" },
  ];

  return (
    <div className="space-y-6 overflow-x-hidden">
      <AdminPageHeader title={t("admin.costing.title")} subtitle={t("admin.costing.subtitle")} />
      {!canWrite && (
        <p className="rounded-xl bg-[#FFF4E2] px-4 py-2 text-sm text-[#70665D]">{t("admin.costing.readOnly")}</p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm font-bold",
              tab === item.id ? "bg-[#F6B800] text-[#171717]" : "bg-warm-white text-[#171717] ring-1 ring-beige-dark/20"
            )}
          >
            {t(item.key)}
          </button>
        ))}
      </div>

      {tab === "ingredients" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("admin.costing.searchIngredients")}
              className="sm:max-w-xs"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="sm:w-52">
                <SelectValue placeholder={t("admin.costing.filterCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.costing.allCategories")}</SelectItem>
                {INGREDIENT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {t(`admin.costing.cat.${category}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canWrite && (
              <Button
                className="bg-[#D71920] hover:bg-[#B51218] sm:ms-auto"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t("admin.costing.addIngredient")}
              </Button>
            )}
          </div>

          {ingredientsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl bg-beige/40" />
              ))}
            </div>
          ) : filteredIngredients.length === 0 ? (
            <AdminEmptyState icon={Calculator} title={t("admin.costing.emptyIngredients")} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredIngredients.map((ingredient) => (
                <AdminCard key={ingredient.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#171717]">{ingredient.name}</h3>
                      <p className="mt-1 text-sm text-[#70665D]">
                        {ingredient.purchaseQuantity} {t(`admin.costing.unit.${ingredient.purchaseUnit}`)} ·{" "}
                        {formatPrice(ingredient.purchasePrice)}
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-[#D71920]">
                        {formatIngredientUnitCost(ingredient, t(`admin.costing.unit.${ingredient.baseUnit}`))}
                      </p>
                    </div>
                    {canWrite && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 hover:bg-beige/40"
                          onClick={() => {
                            setEditing(ingredient);
                            setFormOpen(true);
                          }}
                          aria-label={t("admin.costing.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 hover:bg-beige/40"
                          onClick={() => {
                            if (window.confirm(t("admin.costing.delete"))) {
                              void deleteIngredient(ingredient.id);
                            }
                          }}
                          aria-label={t("admin.costing.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </AdminCard>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "recipes" && (
        <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:items-start">
          <AdminCard title={t("admin.costing.tab.ingredients")} className="order-3 lg:order-1">
            <div className="space-y-2">
              {filteredIngredients.map((ingredient) => (
                <button
                  key={ingredient.id}
                  type="button"
                  disabled={!canWrite || !selectedProductId}
                  onClick={() => void addIngredientToRecipe(ingredient.id)}
                  className="flex w-full flex-col rounded-xl bg-[#FFF4E2] px-3 py-2 text-start disabled:opacity-50"
                >
                  <span className="text-sm font-bold">{ingredient.name}</span>
                  <span className="text-xs text-[#70665D]">
                    {formatIngredientUnitCost(ingredient, t(`admin.costing.unit.${ingredient.baseUnit}`))}
                  </span>
                </button>
              ))}
            </div>
          </AdminCard>

          <div className="order-2 space-y-4">
            <AdminCard>
              <label className="text-sm font-semibold">{t("admin.costing.selectDish")}</label>
              <Select
                value={selectedProductId || "__none__"}
                onValueChange={(value) => setSelectedProductId(value === "__none__" ? "" : value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("admin.costing.selectDish")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("admin.costing.selectDish")}</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <LocalizedProductName product={product} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AdminCard>

            {selectedProduct && dish && (
              <AdminCard>
                <h3 className="mb-3 font-display text-xl font-bold">
                  <LocalizedProductName product={selectedProduct} />
                </h3>
                {!dish.hasRecipe && (
                  <p className="mb-3 rounded-xl bg-[#FFF4E2] px-3 py-2 text-sm">{t("admin.costing.noRecipe")}</p>
                )}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-start text-xs text-coffee/60">
                        <th className="pb-2">{t("admin.costing.col.ingredient")}</th>
                        <th className="pb-2">{t("admin.costing.col.qty")}</th>
                        <th className="pb-2">{t("admin.costing.col.unit")}</th>
                        <th className="pb-2">{t("admin.costing.col.unitCost")}</th>
                        <th className="pb-2">{t("admin.costing.col.cost")}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {dish.lines.map((line, index) => (
                        <tr key={`${line.ingredientId}-${index}`} className="border-t border-beige-dark/15">
                          <td className="py-2 font-medium">
                            {line.ingredientName || line.ingredientId}
                            {line.missingPrice && (
                              <span className="ms-2 text-xs text-[#D71920]">{t("admin.costing.missingPrice")}</span>
                            )}
                          </td>
                          <td className="py-2">
                            <Input
                              type="number"
                              min={0}
                              step="1"
                              className="h-9 w-24"
                              value={line.quantity}
                              disabled={!canWrite}
                              onChange={(event) =>
                                void updateLine(index, { quantity: Number(event.target.value) || 0 })
                              }
                            />
                          </td>
                          <td className="py-2">
                            <Select
                              value={line.unit}
                              onValueChange={(value) => void updateLine(index, { unit: value as CostingUnit })}
                              disabled={!canWrite}
                            >
                              <SelectTrigger className="h-9 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COSTING_UNITS.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {t(`admin.costing.unit.${unit}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 tabular-nums">{formatPrice(line.unitCost)}</td>
                          <td className="py-2 font-bold tabular-nums">{formatPrice(line.lineCost)}</td>
                          <td className="py-2">
                            {canWrite && (
                              <button type="button" onClick={() => void removeLine(index)}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 md:hidden">
                  {dish.lines.map((line, index) => (
                    <div key={`${line.ingredientId}-${index}`} className="rounded-xl bg-[#FFF4E2] p-3">
                      <p className="font-bold">{line.ingredientName || line.ingredientId}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={line.quantity}
                          disabled={!canWrite}
                          onChange={(event) => void updateLine(index, { quantity: Number(event.target.value) || 0 })}
                        />
                        <Select
                          value={line.unit}
                          onValueChange={(value) => void updateLine(index, { unit: value as CostingUnit })}
                          disabled={!canWrite}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COSTING_UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {t(`admin.costing.unit.${unit}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="mt-2 text-sm tabular-nums">
                        {formatPrice(line.unitCost)} · {formatPrice(line.lineCost)}
                      </p>
                    </div>
                  ))}
                </div>
                {canWrite && selectedProductId && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      const first = filteredIngredients[0];
                      if (first) void addIngredientToRecipe(first.id);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {t("admin.costing.addToRecipe")}
                  </Button>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-beige-dark/20 pt-3">
                  <span className="font-semibold">{t("admin.costing.totalIngredients")}</span>
                  <span className="text-xl font-bold tabular-nums">{formatPrice(dish.totalCost)}</span>
                </div>
              </AdminCard>
            )}
          </div>

          <div className="order-1 space-y-4 lg:order-3">
            {selectedProduct && dish && (
              <PricingPanel
                product={selectedProduct}
                dish={dish}
                settings={liveSettings}
                targetPct={targetPct}
                canWrite={canWrite}
                onTargetChange={(value) => void persistTarget(value)}
                onApply={() => void applyRecommended()}
              />
            )}
          </div>
        </section>
      )}

      {tab === "analysis" && (
        <section className="space-y-4">
          <Select value={analysisSort} onValueChange={(value) => setAnalysisSort(value as SortKey)}>
            <SelectTrigger className="sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profitHigh">{t("admin.costing.sort.profitHigh")}</SelectItem>
              <SelectItem value="profitLow">{t("admin.costing.sort.profitLow")}</SelectItem>
              <SelectItem value="foodHigh">{t("admin.costing.sort.foodHigh")}</SelectItem>
              <SelectItem value="foodLow">{t("admin.costing.sort.foodLow")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-start text-xs text-coffee/60">
                  <th className="pb-2">{t("admin.costing.selectDish")}</th>
                  <th className="pb-2">{t("admin.costing.sellingPrice")}</th>
                  <th className="pb-2">{t("admin.costing.ingredientCost")}</th>
                  <th className="pb-2">{t("admin.costing.grossProfit")}</th>
                  <th className="pb-2">{t("admin.costing.foodCost")}</th>
                  <th className="pb-2">{t("admin.costing.margin")}</th>
                </tr>
              </thead>
              <tbody>
                {analysisRows.map(({ product, breakdown }) => (
                  <tr key={product.id} className="border-t border-beige-dark/15">
                    <td className="py-2 font-medium">
                      <LocalizedProductName product={product} />
                      {!breakdown.hasRecipe && (
                        <p className="text-xs text-[#B8860B]">{t("admin.costing.noRecipe")}</p>
                      )}
                    </td>
                    <td className="py-2 tabular-nums">{formatPrice(breakdown.sellingPrice)}</td>
                    <td className="py-2 tabular-nums">{formatPrice(breakdown.totalCost)}</td>
                    <td className="py-2 tabular-nums">{formatPrice(breakdown.grossProfit)}</td>
                    <td className={cn("py-2 tabular-nums font-bold", toneClass(foodCostTone(breakdown.foodCostPercentage, liveSettings)))}>
                      {breakdown.foodCostPercentage === null ? "—" : `${breakdown.foodCostPercentage}%`}
                    </td>
                    <td className="py-2 tabular-nums">
                      {breakdown.grossMargin === null ? "—" : `${breakdown.grossMargin}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {analysisRows.map(({ product, breakdown }) => (
              <AdminCard key={product.id} className="p-4">
                <h3 className="font-bold">
                  <LocalizedProductName product={product} />
                </h3>
                {!breakdown.hasRecipe && (
                  <p className="mt-1 text-xs text-[#B8860B]">{t("admin.costing.noRecipe")}</p>
                )}
                <p className="mt-2 text-sm tabular-nums">
                  {formatPrice(breakdown.sellingPrice)} · {formatPrice(breakdown.totalCost)} · {formatPrice(breakdown.grossProfit)}
                </p>
                <p className={cn("mt-1 text-sm font-bold", toneClass(foodCostTone(breakdown.foodCostPercentage, liveSettings)))}>
                  Food Cost {breakdown.foodCostPercentage === null ? "—" : `${breakdown.foodCostPercentage}%`}
                </p>
              </AdminCard>
            ))}
          </div>
        </section>
      )}

      <IngredientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        canWrite={canWrite}
        onSave={saveDraft}
      />

    </div>
  );
}

function PricingPanel({
  product,
  dish,
  settings,
  targetPct,
  canWrite,
  onTargetChange,
  onApply,
}: {
  product: Product;
  dish: ReturnType<typeof calculateDishCost>;
  settings: import("@/types/costing").CostingSettings;
  targetPct: string;
  canWrite: boolean;
  onTargetChange: (value: string) => void;
  onApply: () => void;
}) {
  const t = useT();
  const localized = useLocalizedProduct(product);
  const tone = foodCostTone(dish.foodCostPercentage, settings);
  const highCost = tone === "red";

  return (
    <AdminCard title={t("admin.costing.pricing")}>
      <div className="relative mb-4 h-36 overflow-hidden rounded-xl bg-[#FFF4E2]">
        <ProductImage image={product.image} categoryId={product.categoryId} alt={localized.name} className="object-cover" />
      </div>
      <h3 className="font-display text-lg font-bold" dir={localized.dir}>
        {localized.name}
      </h3>
      {localized.description ? (
        <p className="mt-1 line-clamp-3 text-sm text-[#70665D]" dir={localized.dir}>
          {localized.description}
        </p>
      ) : null}
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt>{t("admin.costing.sellingPrice")}</dt>
          <dd className="font-bold tabular-nums">{formatPrice(dish.sellingPrice)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t("admin.costing.ingredientCost")}</dt>
          <dd className="tabular-nums">{formatPrice(dish.totalCost)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t("admin.costing.grossProfit")}</dt>
          <dd className="tabular-nums">{formatPrice(dish.grossProfit)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t("admin.costing.foodCost")}</dt>
          <dd className={cn("font-bold tabular-nums", toneClass(tone))}>
            {dish.foodCostPercentage === null ? "—" : `${dish.foodCostPercentage}%`}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t("admin.costing.margin")}</dt>
          <dd className="tabular-nums">{dish.grossMargin === null ? "—" : `${dish.grossMargin}%`}</dd>
        </div>
      </dl>
      {!dish.hasRecipe && <p className="mt-3 text-sm text-[#B8860B]">{t("admin.costing.noRecipe")}</p>}
      {highCost && <p className="mt-3 text-sm text-[#D71920]">{t("admin.costing.highCost")}</p>}
      <label className="mt-4 block text-sm font-semibold">{t("admin.costing.target")}</label>
      <Select value={targetPct} onValueChange={onTargetChange} disabled={!canWrite}>
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {["25", "30", "35"].map((pct) => (
            <SelectItem key={pct} value={pct}>
              {pct}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-3 text-sm">
        {t("admin.costing.recommended")}:{" "}
        <strong className="tabular-nums">
          {dish.recommendedPrice === null ? "—" : formatPrice(dish.recommendedPrice)}
        </strong>
      </p>
      {canWrite && dish.recommendedPrice !== null && (
        <Button className="mt-3 w-full bg-[#D71920] hover:bg-[#B51218]" onClick={onApply}>
          {t("admin.costing.applyRecommended")}
        </Button>
      )}
    </AdminCard>
  );
}
