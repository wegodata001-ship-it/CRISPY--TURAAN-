"use client";

import { cn } from "@/lib/utils";
import type { PageTemplateId, PdfMenuCustomColors, PdfMenuDraft } from "@/types/pdf-menu";
import { WIZARD_TEMPLATES } from "@/lib/pdf-menu/page-templates";
import { PDF_COLOR_THEMES } from "@/lib/pdf-menu/color-themes";
import { TemplateThumbnail } from "../template-thumbnail";
import { ImageUpload } from "@/features/admin/image-upload";
import { uploadSettingsImage } from "@/services/storageService";
import { SafeMenuImage } from "../safe-menu-image";

interface StepDesignProps {
  draft: PdfMenuDraft;
  logoUrl: string;
  hasOrderUrl: boolean;
  categoryNames: Record<string, string>;
  onChange: (patch: Partial<PdfMenuDraft>) => void;
}

export function StepDesign({ draft, logoUrl, hasOrderUrl, categoryNames, onChange }: StepDesignProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-dark-brown">اختر تصميم القائمة</h2>
      <p className="mt-1 text-sm text-coffee/55">تصميم واحد لكل القائمة. يمكنك تغيير الألوان مباشرة.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {WIZARD_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => onChange({ templateId: tmpl.id })}
            className={cn(
              "rounded-2xl border bg-white p-2 text-start shadow-sm",
              draft.templateId === tmpl.id ? "border-[#E8A87C] ring-2 ring-[#E8A87C]/30" : "border-beige-dark/15"
            )}
          >
            <TemplateThumbnail templateId={tmpl.id} />
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-dark-brown">
              {tmpl.nameAr}
              {tmpl.id === "elegant" && (
                <span className="rounded-full bg-[#E8A87C]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#9B4B5A]">موصى به</span>
              )}
            </p>
            <p className="line-clamp-2 text-[11px] text-coffee/50">{tmpl.descriptionAr}</p>
          </button>
        ))}
      </div>

      <h3 className="mt-8 text-lg font-bold text-dark-brown">اختر الألوان</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {PDF_COLOR_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange({ colorThemeId: theme.id, customColors: theme.colors })}
            className={cn(
              "flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-semibold",
              draft.colorThemeId === theme.id ? "border-[#E8A87C] ring-2 ring-[#E8A87C]/25" : "border-beige-dark/15"
            )}
          >
            <span className="flex -space-x-1 space-x-reverse">
              {theme.swatches.map((c) => (
                <span key={c} className="h-4 w-4 rounded-full border border-white" style={{ background: c }} />
              ))}
            </span>
            {theme.nameAr}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange({ colorThemeId: "custom" })}
          className={cn(
            "rounded-full border bg-white px-3 py-2 text-xs font-semibold",
            draft.colorThemeId === "custom" ? "border-[#E8A87C] ring-2 ring-[#E8A87C]/25" : "border-beige-dark/15"
          )}
        >
          مخصص
        </button>
      </div>

      {draft.colorThemeId === "custom" && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 sm:grid-cols-5">
          {(
            [
              ["primary", "أساسي"],
              ["secondary", "ثانوي"],
              ["background", "خلفية"],
              ["text", "نص"],
              ["accent", "تمييز"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs text-coffee/60">
              {label}
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-lg border"
                value={draft.customColors[key as keyof PdfMenuCustomColors]}
                onChange={(e) => onChange({ customColors: { ...draft.customColors, [key]: e.target.value } })}
              />
            </label>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-4 rounded-2xl border border-beige-dark/15 bg-white p-4">
        <div>
          <p className="mb-2 text-sm font-bold text-dark-brown">الشعار</p>
          {logoUrl ? (
            <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-[#FFF8F3]">
              <SafeMenuImage src={logoUrl} alt="" className="max-h-full max-w-full object-contain" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
            </div>
          ) : (
            <ImageUpload
              compact
              value={draft.logoOverrideUrl}
              onChange={(url) => onChange({ logoOverrideUrl: url, showLogo: true })}
              onUpload={async (file, onProgress, options) =>
                uploadSettingsImage(file, "logo", { onProgress, signal: options?.signal })
              }
            />
          )}
          <Toggle label="إظهار الشعار" checked={draft.showLogo} onChange={(v) => onChange({ showLogo: v })} />
        </div>
        <Toggle label="إضافة صفحة غلاف" checked={draft.showCover} onChange={(v) => onChange({ showCover: v })} />
        <Toggle
          label={hasOrderUrl ? "إظهار QR للطلب" : "إظهار QR (أضف رابط المتجر)"}
          checked={draft.showQr}
          onChange={(v) => onChange({ showQr: v })}
        />
      </div>

      <details className="mt-5 rounded-2xl border border-beige-dark/15 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-coffee/70">إعدادات متقدمة</summary>
        <p className="mt-2 text-xs text-coffee/45">استخدم تصميمًا مختلفًا لصفحة معيّنة.</p>
        <div className="mt-3 space-y-2">
          {draft.pageOrder.map((page, index) => (
            <label key={page.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-dark-brown">
                صفحة {index + 1} — {page.categoryIds.map((id) => categoryNames[id] ?? id).join("، ")}
              </span>
              <select
                className="rounded-xl border border-beige-dark/20 bg-[#FFF8F3] px-2 py-1 text-xs"
                value={draft.pageTemplateOverrides[page.id] ?? draft.templateId}
                onChange={(e) =>
                  onChange({
                    pageTemplateOverrides: {
                      ...draft.pageTemplateOverrides,
                      [page.id]: e.target.value as PageTemplateId,
                    },
                  })
                }
              >
                {WIZARD_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameAr}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-sm text-dark-brown">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full", checked ? "bg-[#E8A87C]" : "bg-beige-dark/30")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow", checked ? "end-0.5" : "start-0.5")} />
      </button>
    </label>
  );
}
