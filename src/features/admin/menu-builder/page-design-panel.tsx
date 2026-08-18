"use client";

import type { MenuPage, PageCustomSettings } from "@/types/pdf-menu";
import { getPageTemplate } from "@/lib/pdf-menu/page-templates";

interface PageDesignPanelProps {
  page: MenuPage;
  onChange: (updates: Partial<PageCustomSettings>) => void;
}

export function PageDesignPanel({ page, onChange }: PageDesignPanelProps) {
  const s = page.customSettings;
  const def = getPageTemplate(page.pageTemplateId);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-coffee/40">تصميم الصفحة</h4>
        <p className="mt-1 text-[11px] text-coffee/50">
          القالب: {def.nameAr}
          {page.recommendedTemplateId !== page.pageTemplateId && (
            <> · مقترح: {getPageTemplate(page.recommendedTemplateId).nameAr}</>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-coffee/40">ألوان</h4>
        <div className="space-y-2.5">
          <ColorRow label="خلفية" value={s.backgroundColor} onChange={(v) => onChange({ backgroundColor: v })} />
          <ColorRow label="العنوان" value={s.headingColor} onChange={(v) => onChange({ headingColor: v })} />
          <ColorRow label="النص" value={s.textColor} onChange={(v) => onChange({ textColor: v })} />
          <ColorRow label="تمييز" value={s.accentColor} onChange={(v) => onChange({ accentColor: v })} />
        </div>
      </div>

      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-coffee/40">مقاسات</h4>
        <div className="space-y-2">
          <SelectRow
            label="حجم الخط"
            value={s.fontSize}
            options={[
              { value: "sm", label: "صغير" },
              { value: "md", label: "وسط" },
              { value: "lg", label: "كبير" },
            ]}
            onChange={(v) => onChange({ fontSize: v as PageCustomSettings["fontSize"] })}
          />
          <SelectRow
            label="حجم الصورة"
            value={s.imageSize}
            options={[
              { value: "sm", label: "صغير" },
              { value: "md", label: "وسط" },
              { value: "lg", label: "كبير" },
            ]}
            onChange={(v) => onChange({ imageSize: v as PageCustomSettings["imageSize"] })}
          />
          <SelectRow
            label="أعمدة"
            value={String(s.columns)}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ]}
            onChange={(v) => onChange({ columns: Number(v) })}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-coffee/40">صورة الخلفية</h4>
        <input
          type="text"
          value={s.backgroundImageUrl}
          onChange={(e) => onChange({ backgroundImageUrl: e.target.value })}
          placeholder="رابط الصورة..."
          className="w-full rounded-lg border border-beige-dark/20 px-3 py-2 text-xs text-dark-brown placeholder:text-coffee/30 focus:border-turquoise focus:outline-none"
        />
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-dark-brown">{label}</span>
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border border-beige-dark/20"
      />
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-dark-brown">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-beige-dark/20 bg-white px-2 py-1 text-xs text-dark-brown"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
