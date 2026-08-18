"use client";

import { Copy, Lock, Unlock, Trash2, Palette, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuPage, PdfMenuTemplate } from "@/types/pdf-menu";
import { A4Stage } from "./a4-stage";
import { MenuPageRenderer } from "./menu-page-renderer";
import { getPageTemplate } from "@/lib/pdf-menu/page-templates";

interface PageOrganizerProps {
  pages: MenuPage[];
  menuTemplate: PdfMenuTemplate | null;
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onMove: (pageId: string, direction: "up" | "down") => void;
  onChangeDesign: (pageId: string) => void;
  onLock: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
}

export function PageOrganizer({
  pages,
  menuTemplate,
  selectedPageId,
  onSelectPage,
  onReorder,
  onMove,
  onChangeDesign,
  onLock,
  onDuplicate,
  onDelete,
}: PageOrganizerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {pages.map((page, index) => {
        const selected = page.id === selectedPageId;
        return (
          <div
            key={page.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-mishkat-page", String(index));
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData("application/x-mishkat-page"));
              if (!Number.isNaN(from)) onReorder(from, index);
            }}
            onClick={() => onSelectPage(page.id)}
            className={cn(
              "cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm transition-all",
              selected ? "border-turquoise ring-2 ring-turquoise/20" : "border-beige-dark/15 hover:border-turquoise/40"
            )}
          >
            <div className="pointer-events-none">
              <A4Stage maxWidth={220}>
                <MenuPageRenderer page={page} menuTemplate={menuTemplate} mode="preview" />
              </A4Stage>
            </div>
            <div className="border-t border-beige-dark/10 px-2 py-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-dark-brown">
                  {page.pageNumber} · {getPageTemplate(page.pageTemplateId).nameAr}
                </span>
                {page.locked && <Lock className="h-3 w-3 text-amber-500" />}
              </div>
              <div className="mt-1 flex items-center gap-0.5">
                <IconBtn label="أعلى" onClick={() => onMove(page.id, "up")}><ChevronUp className="h-3 w-3" /></IconBtn>
                <IconBtn label="أسفل" onClick={() => onMove(page.id, "down")}><ChevronDown className="h-3 w-3" /></IconBtn>
                <IconBtn label="تصميم" onClick={() => onChangeDesign(page.id)}><Palette className="h-3 w-3" /></IconBtn>
                <IconBtn label="قفل" onClick={() => onLock(page.id)}>
                  {page.locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                </IconBtn>
                <IconBtn label="نسخ" onClick={() => onDuplicate(page.id)}><Copy className="h-3 w-3" /></IconBtn>
                <IconBtn label="حذف" onClick={() => onDelete(page.id)} danger><Trash2 className="h-3 w-3" /></IconBtn>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "rounded p-1 text-coffee/40 hover:bg-beige hover:text-dark-brown",
        danger && "hover:bg-red-50 hover:text-red-500"
      )}
    >
      {children}
    </button>
  );
}
