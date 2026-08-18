"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import type { MenuPage, PdfMenuTemplate } from "@/types/pdf-menu";
import { A4Stage } from "./a4-stage";
import { MenuPageRenderer } from "./menu-page-renderer";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  pages: MenuPage[];
  template: PdfMenuTemplate | null;
  onExport: () => void;
  debug?: boolean;
}

export function PreviewModal({ open, onClose, pages, template, onExport, debug = false }: PreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(0);

  if (!open || typeof document === "undefined") return null;

  const page = pages[currentPage];

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex flex-col bg-dark-brown/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-white/70">معاينة القائمة</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm text-white/80">{page ? page.pageNumber : 0} / {pages.length}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
              disabled={currentPage === pages.length - 1}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => { onExport(); onClose(); }}
            className="flex items-center gap-1.5 rounded-lg bg-turquoise px-3 py-1.5 text-xs font-semibold text-white hover:bg-turquoise-light"
          >
            <Download className="h-3.5 w-3.5" />
            تصدير PDF
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-6">
        {page && (
          <div className="overflow-hidden rounded-lg shadow-2xl">
            <A4Stage maxWidth={600}>
              <MenuPageRenderer page={page} menuTemplate={template} mode="preview" debug={debug} />
            </A4Stage>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
