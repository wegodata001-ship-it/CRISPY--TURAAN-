"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/types";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import type { Locale } from "@/lib/i18n/types";
import { formatMenuPrice } from "@/lib/pdf-menu/a4";
import { SafeMenuImage } from "../safe-menu-image";

interface StepProductsProps {
  categories: Category[];
  products: Product[];
  selectedCategoryIds: string[];
  excludedProductIds: string[];
  locale: Locale;
  onChangeExcluded: (ids: string[]) => void;
}

export function StepProducts({
  categories,
  products,
  selectedCategoryIds,
  excludedProductIds,
  locale,
  onChangeExcluded,
}: StepProductsProps) {
  const [query, setQuery] = useState("");
  const excluded = new Set(excludedProductIds);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return selectedCategoryIds.map((id) => {
      const cat = categories.find((c) => c.id === id);
      const items = products.filter((p) => p.categoryId === id && p.available && p.active).sort((a, b) => a.sortOrder - b.sortOrder);
      const filtered = q
        ? items.filter((p) => getLocalizedName(p, locale).toLowerCase().includes(q))
        : items;
      return { cat, items, filtered };
    }).filter((s) => s.cat);
  }, [selectedCategoryIds, categories, products, query, locale]);

  const setCategoryAll = (productIds: string[], include: boolean) => {
    const next = new Set(excludedProductIds);
    for (const id of productIds) {
      if (include) next.delete(id);
      else next.add(id);
    }
    onChangeExcluded([...next]);
  };

  const toggle = (id: string) => {
    onChangeExcluded(excluded.has(id) ? excludedProductIds.filter((x) => x !== id) : [...excludedProductIds, id]);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-dark-brown">اختر المنتجات التي ستظهر في القائمة</h2>
      <p className="mt-1 text-sm text-coffee/55">إلغاء التحديد يخفي المنتج من الـ PDF فقط — لا يُحذف من المتجر.</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن منتج..."
        className="mt-4 w-full rounded-2xl border border-beige-dark/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#E8A87C]"
      />

      <div className="mt-5 space-y-4">
        {sections.map(({ cat, items, filtered }) => {
          if (!cat) return null;
          const selectedCount = items.filter((p) => !excluded.has(p.id)).length;
          return (
            <section key={cat.id} className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-dark-brown">{getLocalizedName(cat, locale)}</h3>
                  <p className="text-xs text-coffee/50">{selectedCount} / {items.length} منتجات مختارة</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="text-xs font-semibold text-[#9B4B5A]" onClick={() => setCategoryAll(items.map((p) => p.id), true)}>تحديد الكل</button>
                  <button type="button" className="text-xs font-semibold text-coffee/50" onClick={() => setCategoryAll(items.map((p) => p.id), false)}>إلغاء تحديد الكل</button>
                </div>
              </div>
              <div className="space-y-2">
                {filtered.map((p) => {
                  const on = !excluded.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start",
                        on ? "border-[#E8A87C]/40 bg-[#FFF5F0]" : "border-beige-dark/10 bg-beige/20 opacity-60"
                      )}
                    >
                      <span className={cn("grid h-6 w-6 place-items-center rounded-full border", on ? "border-[#E8A87C] bg-[#E8A87C] text-white" : "border-beige-dark/30")}>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <div className="h-10 w-10 overflow-hidden rounded-lg bg-beige/50">
                        <SafeMenuImage src={p.image} alt="" productId={p.id} productName={getLocalizedName(p, locale)} className="h-full w-full object-cover" style={{ width: "100%", height: "100%" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-dark-brown">{getLocalizedName(p, locale)}</p>
                        {p.price > 0 && <p className="text-xs text-coffee/50" dir="ltr">{formatMenuPrice(p.price)}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
