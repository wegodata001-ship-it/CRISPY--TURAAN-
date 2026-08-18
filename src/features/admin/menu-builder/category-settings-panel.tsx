"use client";

import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PdfMenuCategorySetting, PdfMenuCategoryWithProducts, PdfLayout } from "@/types/pdf-menu";

interface CategorySettingsPanelProps {
  category: PdfMenuCategoryWithProducts;
  onUpdate: (updates: Partial<PdfMenuCategorySetting>) => void;
}

const LAYOUT_OPTIONS: { value: PdfLayout; label: string }[] = [
  { value: "1-column", label: "عمود واحد" },
  { value: "2-columns", label: "عمودين" },
  { value: "3-columns", label: "3 أعمدة" },
  { value: "list", label: "قائمة" },
  { value: "grid", label: "شبكة" },
  { value: "image-cards", label: "بطاقات" },
];

export function CategorySettingsPanel({ category, onUpdate }: CategorySettingsPanelProps) {
  const setting = category.setting;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-dark-brown">{category.category.name}</h3>
          <button
            type="button"
            onClick={() => onUpdate({ locked: !setting.locked })}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              setting.locked ? "bg-amber-50 text-amber-600" : "text-coffee/30 hover:bg-beige"
            )}
          >
            {setting.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-coffee/50">
          {category.products.filter((p) => p.visible).length} منتج مرئي · {category.computedSize}%
        </p>
      </div>

      {/* Display settings */}
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-coffee/40">العرض</h4>
        <div className="space-y-2.5">
          <ToggleRow label="عنوان الفئة" checked={setting.showTitle} onChange={(v) => onUpdate({ showTitle: v })} />
          <ToggleRow label="وصف المنتجات" checked={setting.showDescription} onChange={(v) => onUpdate({ showDescription: v })} />
          <ToggleRow label="صور المنتجات" checked={setting.showImages} onChange={(v) => onUpdate({ showImages: v })} />
          <ToggleRow label="الأسعار" checked={setting.showPrices} onChange={(v) => onUpdate({ showPrices: v })} />
          <ToggleRow label="العملة" checked={setting.showCurrency} onChange={(v) => onUpdate({ showCurrency: v })} />
          <ToggleRow label="بدء صفحة جديدة" checked={setting.startOnNewPage} onChange={(v) => onUpdate({ startOnNewPage: v })} />
        </div>
      </div>

      {/* Layout */}
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-coffee/40">التخطيط</h4>
        <div className="grid grid-cols-3 gap-1.5">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({ layout: opt.value, columns: opt.value === "3-columns" ? 3 : opt.value === "1-column" || opt.value === "list" ? 1 : 2 })}
              className={cn(
                "rounded-lg px-2 py-2 text-[10px] font-semibold transition-colors",
                setting.layout === opt.value
                  ? "bg-turquoise text-white shadow-sm"
                  : "bg-beige/50 text-coffee/60 hover:bg-beige"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-coffee/40">الألوان</h4>
        <div className="space-y-2.5">
          <ColorRow label="خلفية" value={setting.backgroundColor} onChange={(v) => onUpdate({ backgroundColor: v })} />
          <ColorRow label="العنوان" value={setting.titleColor} onChange={(v) => onUpdate({ titleColor: v })} />
          <ColorRow label="النص" value={setting.textColor} onChange={(v) => onUpdate({ textColor: v })} />
          <ColorRow label="تمييز" value={setting.accentColor} onChange={(v) => onUpdate({ accentColor: v })} />
        </div>
      </div>

      {/* Background image */}
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-coffee/40">صورة الخلفية</h4>
        <input
          type="text"
          value={setting.backgroundImageUrl}
          onChange={(e) => onUpdate({ backgroundImageUrl: e.target.value })}
          placeholder="رابط الصورة..."
          className="w-full rounded-lg border border-beige-dark/20 px-3 py-2 text-xs text-dark-brown placeholder:text-coffee/30 focus:border-turquoise focus:outline-none"
        />
        {setting.backgroundImageUrl && (
          <button
            type="button"
            onClick={() => onUpdate({ backgroundImageUrl: "" })}
            className="mt-2 text-[11px] text-red-500 hover:underline"
          >
            إزالة الخلفية
          </button>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-xs text-dark-brown">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-turquoise" : "bg-beige-dark/25"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            checked ? "end-0.5" : "start-0.5"
          )}
        />
      </button>
    </label>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-dark-brown">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border border-beige-dark/20"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] text-coffee/40 hover:text-red-500"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
