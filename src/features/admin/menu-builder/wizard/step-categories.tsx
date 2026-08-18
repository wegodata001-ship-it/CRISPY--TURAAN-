"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import type { Locale } from "@/lib/i18n/types";
import { SafeMenuImage } from "../safe-menu-image";

interface StepCategoriesProps {
  categories: Category[];
  productCounts: Record<string, number>;
  selectedIds: string[];
  locale: Locale;
  onChange: (ids: string[]) => void;
}

export function StepCategories({ categories, productCounts, selectedIds, locale, onChange }: StepCategoriesProps) {
  const selected = new Set(selectedIds);
  const toggle = (id: string) => {
    const next = selected.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-dark-brown">اختر الفئات التي تريد إضافتها إلى القائمة</h2>
      <p className="mt-1 text-sm text-coffee/55">يمكنك تحديد أكثر من فئة. التغيير لا يؤثر على الموقع.</p>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => onChange(categories.map((c) => c.id))} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-coffee shadow-sm">
          تحديد الكل
        </button>
        <button type="button" onClick={() => onChange([])} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-coffee shadow-sm">
          إلغاء تحديد الكل
        </button>
      </div>

      {categories.length === 0 && (
        <p className="mt-6 text-sm text-coffee/50">لا توجد فئات بعد. أضف فئات من لوحة الإدارة أولاً.</p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => {
          const on = selected.has(cat.id);
          const count = productCounts[cat.id] ?? 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-white p-3 text-start shadow-sm transition-all",
                on ? "border-[#E8A87C] ring-2 ring-[#E8A87C]/30" : "border-beige-dark/15 hover:border-[#E8A87C]/50"
              )}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-beige/40">
                <SafeMenuImage src={cat.image} alt="" className="h-full w-full object-cover" style={{ width: "100%", height: "100%" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-dark-brown">{getLocalizedName(cat, locale)}</p>
                <p className="text-xs text-coffee/50">{count} منتج</p>
              </div>
              <span className={cn("grid h-7 w-7 place-items-center rounded-full border", on ? "border-[#E8A87C] bg-[#E8A87C] text-white" : "border-beige-dark/30")}>
                {on && <Check className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
