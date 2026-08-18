"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Palette,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuPage, PdfMenuTemplate } from "@/types/pdf-menu";
import { A4Stage } from "./a4-stage";
import { MenuPageRenderer } from "./menu-page-renderer";
import { getPageTemplate } from "@/lib/pdf-menu/page-templates";

interface PagePreviewProps {
  pages: MenuPage[];
  locale: string;
  template: PdfMenuTemplate | null;
  currentIndex: number;
  onCurrentIndexChange: (index: number) => void;
  onReorderPages: (from: number, to: number) => void;
  onMovePage: (pageId: string, direction: "up" | "down") => void;
  onChangeDesign: (pageId: string) => void;
  onToggleLock: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onAddPage: () => void;
  onDropCategory: (pageId: string, categoryId: string) => void;
  debug?: boolean;
}

export function PagePreview({
  pages,
  template,
  currentIndex,
  onCurrentIndexChange,
  onReorderPages,
  onMovePage,
  onChangeDesign,
  onToggleLock,
  onDuplicate,
  onDelete,
  onAddPage,
  onDropCategory,
  debug = false,
}: PagePreviewProps) {
  const [dragOver, setDragOver] = useState(false);
  const page = pages[currentIndex];

  if (pages.length === 0) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-dashed border-beige-dark/25 bg-white">
        <p className="text-lg font-semibold text-coffee/40">لا توجد صفحات</p>
        <p className="mt-1 text-sm text-coffee/30">فعّل بعض الفئات أو أضف صفحة</p>
        <button
          type="button"
          onClick={onAddPage}
          className="mt-4 rounded-xl bg-turquoise px-4 py-2 text-sm font-semibold text-white"
        >
          إضافة صفحة
        </button>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onCurrentIndexChange(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="rounded-lg p-1.5 text-coffee/50 hover:bg-beige disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-coffee/70">
          صفحة {page.pageNumber} / {pages.length}
        </span>
        <button
          type="button"
          onClick={() => onCurrentIndexChange(Math.min(pages.length - 1, currentIndex + 1))}
          disabled={currentIndex === pages.length - 1}
          className="rounded-lg p-1.5 text-coffee/50 hover:bg-beige disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-2xl border border-beige-dark/15 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <span className="ms-1 me-auto flex items-center gap-1 text-xs font-bold text-dark-brown">
            <GripVertical className="h-3.5 w-3.5 text-coffee/30" />
            PAGE {page.pageNumber}
            {page.locked && <Lock className="h-3 w-3 text-amber-500" />}
          </span>
          <ToolBtn onClick={() => onChangeDesign(page.id)}><Palette className="h-3.5 w-3.5" /> تغيير التصميم</ToolBtn>
          <ToolBtn onClick={() => onToggleLock(page.id)}>
            {page.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {page.locked ? "فتح" : "قفل"}
          </ToolBtn>
          <ToolBtn onClick={() => onDuplicate(page.id)}><Copy className="h-3.5 w-3.5" /> نسخ</ToolBtn>
          <ToolBtn onClick={() => onDelete(page.id)} danger><Trash2 className="h-3.5 w-3.5" /> حذف</ToolBtn>
          <div className="flex lg:hidden">
            <ToolBtn onClick={() => onMovePage(page.id, "up")}><ChevronUp className="h-3.5 w-3.5" /></ToolBtn>
            <ToolBtn onClick={() => onMovePage(page.id, "down")}><ChevronDown className="h-3.5 w-3.5" /></ToolBtn>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[500px]">
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border bg-white shadow-lg transition-colors",
              dragOver ? "border-turquoise ring-2 ring-turquoise/30" : "border-beige-dark/20"
            )}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-mishkat-page", String(currentIndex));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (e.dataTransfer.types.includes("application/x-mishkat-category")) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const categoryId = e.dataTransfer.getData("application/x-mishkat-category");
              const fromPage = e.dataTransfer.getData("application/x-mishkat-page");
              if (categoryId) onDropCategory(page.id, categoryId);
              else if (fromPage !== "") onReorderPages(Number(fromPage), currentIndex);
            }}
          >
            <div className="absolute end-2 top-2 z-10 rounded-full bg-dark-brown/70 px-2 py-0.5 text-[10px] font-bold text-white">
              {page.usedCapacity}%
            </div>
            <A4Stage maxWidth={500}>
              <MenuPageRenderer page={page} menuTemplate={template} mode="preview" debug={debug} />
            </A4Stage>
          </div>
        </div>

        <div className="mx-auto mt-3 max-w-[500px]">
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-beige-dark/15">
              <div
                className={cn(
                  "h-full rounded-full",
                  page.usedCapacity > 100 ? "bg-red-500" : page.usedCapacity > 85 ? "bg-amber-400" : "bg-turquoise"
                )}
                style={{ width: `${Math.min(100, page.usedCapacity)}%` }}
              />
            </div>
            <span className="text-[11px] text-coffee/50">{page.usedCapacity}/100</span>
          </div>
          <p className="mt-1 text-[11px] text-coffee/45">
            التصميم: {getPageTemplate(page.pageTemplateId).nameAr}
            {page.categories.length > 0 && ` · ${page.categories.map((c) => c.category.name).join(" + ")}`}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAddPage}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-beige-dark/25 py-2 text-xs font-semibold text-coffee/50 hover:border-turquoise hover:text-turquoise"
      >
        <Plus className="h-3.5 w-3.5" />
        إضافة صفحة
      </button>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-coffee/60 hover:bg-beige",
        danger && "hover:bg-red-50 hover:text-red-600"
      )}
    >
      {children}
    </button>
  );
}
