"use client";

import { AdminModal, AdminModalHeader, AdminModalTitle, AdminModalBody } from "@/features/admin/components/admin-modal";
import { CONTENT_PAGE_TEMPLATES, getPageTemplate } from "@/lib/pdf-menu/page-templates";
import { TemplateThumbnail } from "./page-template-renderer";
import { cn } from "@/lib/utils";
import type { PageTemplateId } from "@/types/pdf-menu";

interface TemplatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId: PageTemplateId;
  recommendedId?: PageTemplateId;
  onSelect: (id: PageTemplateId) => void;
}

export function TemplatePickerModal({
  open,
  onOpenChange,
  selectedId,
  recommendedId,
  onSelect,
}: TemplatePickerModalProps) {
  return (
    <AdminModal open={open} onOpenChange={onOpenChange} size="lg">
      <AdminModalHeader onClose={() => onOpenChange(false)}>
        <AdminModalTitle>تغيير التصميم</AdminModalTitle>
        <p className="mt-1 text-xs text-coffee/50">المحتوى يبقى كما هو — يتغير الشكل فقط</p>
      </AdminModalHeader>
      <AdminModalBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CONTENT_PAGE_TEMPLATES.map((tmpl) => {
            const selected = selectedId === tmpl.id;
            const recommended = recommendedId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => {
                  onSelect(tmpl.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "rounded-2xl border p-2 text-start transition-all",
                  selected
                    ? "border-turquoise bg-turquoise/5 ring-2 ring-turquoise/30"
                    : "border-beige-dark/15 bg-white hover:border-turquoise/40"
                )}
              >
                <TemplateThumbnail templateId={tmpl.id} />
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-dark-brown">{tmpl.nameAr}</span>
                  {recommended && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                      مقترح
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] text-coffee/50">{tmpl.descriptionAr}</p>
              </button>
            );
          })}
        </div>
      </AdminModalBody>
    </AdminModal>
  );
}

export function PageTemplateLabel({ id }: { id: PageTemplateId }) {
  return <span>{getPageTemplate(id).nameAr}</span>;
}
