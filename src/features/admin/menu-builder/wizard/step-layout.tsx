"use client";

import { Sparkles, Hand, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArrangeMode, PdfMenuPageSlot, PdfPageSize } from "@/types/pdf-menu";

interface StepLayoutProps {
  layoutMode: ArrangeMode;
  onLayoutMode: (mode: ArrangeMode) => void;
  pageOrder: PdfMenuPageSlot[];
  categoryNames: Record<string, string>;
  categoryCount: number;
  categorySizes: Record<string, PdfPageSize>;
  onCategorySize: (id: string, size: PdfPageSize) => void;
  onMovePage: (index: number, dir: -1 | 1) => void;
  onMoveCategory: (fromPage: number, categoryId: string, toPage: number) => void;
}

const SIZES: { id: PdfPageSize; label: string }[] = [
  { id: "AUTO", label: "تلقائي" },
  { id: "QUARTER", label: "صغير" },
  { id: "HALF", label: "نصف" },
  { id: "THREE_QUARTERS", label: "كبير" },
  { id: "FULL", label: "صفحة كاملة" },
];

export function StepLayout({
  layoutMode,
  onLayoutMode,
  pageOrder,
  categoryNames,
  categoryCount,
  categorySizes,
  onCategorySize,
  onMovePage,
  onMoveCategory,
}: StepLayoutProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-dark-brown">كيف تريد ترتيب القائمة؟</h2>
      <p className="mt-1 text-sm text-coffee/55">الترتيب التلقائي موصى به. يمكنك تعديله بعد ذلك.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onLayoutMode("auto")}
          className={cn(
            "rounded-2xl border bg-white p-5 text-start shadow-sm",
            layoutMode === "auto" ? "border-[#E8A87C] ring-2 ring-[#E8A87C]/30" : "border-beige-dark/15"
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#E07A5F]" />
            <span className="font-bold text-dark-brown">ترتيب تلقائي</span>
            <span className="rounded-full bg-[#E8A87C]/20 px-2 py-0.5 text-[10px] font-bold text-[#9B4B5A]">موصى به</span>
          </div>
          <p className="mt-2 text-sm text-coffee/55">دع النظام يرتب الصفحات والفئات بأفضل شكل</p>
        </button>
        <button
          type="button"
          onClick={() => onLayoutMode("manual")}
          className={cn(
            "rounded-2xl border bg-white p-5 text-start shadow-sm",
            layoutMode === "manual" ? "border-[#E8A87C] ring-2 ring-[#E8A87C]/30" : "border-beige-dark/15"
          )}
        >
          <div className="flex items-center gap-2">
            <Hand className="h-5 w-5 text-coffee/60" />
            <span className="font-bold text-dark-brown">ترتيب يدوي</span>
          </div>
          <p className="mt-2 text-sm text-coffee/55">حدد ترتيب الصفحات والفئات بنفسك</p>
        </button>
      </div>

      {pageOrder.length > 0 && (
        <div className="mt-6 rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-dark-brown">
            تم ترتيب {categoryCount} فئات في {pageOrder.length} صفحات
          </p>
          <div className="mt-3 space-y-3">
            {pageOrder.map((page, index) => (
              <div
                key={page.id}
                className="rounded-xl bg-[#FFF5F0] p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const payload = e.dataTransfer.getData("text/plain");
                  if (!payload) return;
                  const [from, categoryId] = payload.split(":");
                  if (!categoryId) return;
                  onMoveCategory(Number(from), categoryId, index);
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#9B4B5A]">صفحة {index + 1}</span>
                  <div className="flex gap-1">
                    <button type="button" className="rounded-lg bg-white p-1" aria-label="تحريك للأعلى" onClick={() => onMovePage(index, -1)}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-lg bg-white p-1" aria-label="تحريك للأسفل" onClick={() => onMovePage(index, 1)}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {page.categoryIds.map((id) => (
                    <span
                      key={id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", `${index}:${id}`)}
                      className="inline-flex cursor-grab items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-dark-brown shadow-sm"
                    >
                      {categoryNames[id] ?? id}
                      {pageOrder.length > 1 && (
                        <select
                          className="bg-transparent text-[10px] text-coffee/50"
                          aria-label="نقل إلى صفحة"
                          value={index}
                          onChange={(e) => onMoveCategory(index, id, Number(e.target.value))}
                        >
                          {pageOrder.map((_, i) => (
                            <option key={i} value={i}>
                              نقل إلى صفحة {i + 1}
                            </option>
                          ))}
                        </select>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="mt-5 rounded-2xl border border-beige-dark/15 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-coffee/70">إعدادات متقدمة</summary>
        <p className="mt-2 text-xs text-coffee/45">حجم كل فئة داخل الصفحة. اتركه تلقائيًا إن لم تكن بحاجة لتعديل.</p>
        <div className="mt-3 space-y-2">
          {pageOrder.flatMap((p) => p.categoryIds).map((id) => (
            <label key={id} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-dark-brown">{categoryNames[id] ?? id}</span>
              <select
                className="rounded-xl border border-beige-dark/20 bg-[#FFF8F3] px-2 py-1 text-xs"
                value={categorySizes[id] ?? "AUTO"}
                onChange={(e) => onCategorySize(id, e.target.value as PdfPageSize)}
              >
                {SIZES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
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
