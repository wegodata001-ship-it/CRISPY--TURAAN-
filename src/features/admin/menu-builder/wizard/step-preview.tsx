"use client";

import { useEffect, useState } from "react";
import type { MenuPage, PdfMenuTemplate, WizardStep } from "@/types/pdf-menu";
import { A4Stage } from "../a4-stage";
import { MenuPageRenderer } from "../menu-page-renderer";

interface StepPreviewProps {
  pages: MenuPage[];
  menuTemplate: PdfMenuTemplate | null;
  onJump: (step: WizardStep) => void;
  onExport: () => void;
  exporting: boolean;
}

export function StepPreview({ pages, menuTemplate, onJump, onExport, exporting }: StepPreviewProps) {
  const [index, setIndex] = useState(0);
  const total = pages.length;
  const safeIndex = Math.min(index, Math.max(0, total - 1));
  const page = pages[safeIndex];

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, pages.length - 1)));
  }, [pages.length]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-dark-brown">معاينة القائمة</h2>
      <p className="mt-1 text-sm text-coffee/55">
        {total} صفحات — ما تراه هنا هو ما سيُصدَّر.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Jump onClick={() => onJump(1)}>تعديل الفئات</Jump>
        <Jump onClick={() => onJump(2)}>تعديل المنتجات</Jump>
        <Jump onClick={() => onJump(3)}>تعديل الترتيب</Jump>
        <Jump onClick={() => onJump(4)}>تغيير التصميم</Jump>
      </div>

      {page && (
        <div className="mt-5">
          <div className="mb-4 flex items-center justify-center gap-4 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={safeIndex === 0}
              className="rounded-full bg-white px-4 py-2 text-coffee shadow-sm disabled:opacity-30"
            >
              السابق
            </button>
            <span className="min-w-[8rem] text-center text-coffee/80">
              صفحة {safeIndex + 1} من {total}
            </span>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              disabled={safeIndex >= total - 1}
              className="rounded-full bg-white px-4 py-2 text-coffee shadow-sm disabled:opacity-30"
            >
              التالي
            </button>
          </div>
          <div className="rounded-2xl bg-[#EDE4D8]/45 px-2 py-5 sm:px-6 sm:py-8">
            <A4Stage>
              <MenuPageRenderer page={page} menuTemplate={menuTemplate} mode="preview" />
            </A4Stage>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onExport}
        disabled={exporting || pages.length === 0}
        className="mt-6 hidden h-12 w-full rounded-2xl bg-[#E8A87C] text-sm font-bold text-white shadow-sm hover:bg-[#de9a6c] disabled:opacity-50 lg:block"
      >
        {exporting ? "جارٍ إنشاء ملف PDF..." : "تصدير PDF"}
      </button>
    </div>
  );
}

function Jump({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-coffee shadow-sm">
      {children}
    </button>
  );
}
