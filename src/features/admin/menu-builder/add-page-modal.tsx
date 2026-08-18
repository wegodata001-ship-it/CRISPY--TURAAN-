"use client";

import { AdminModal, AdminModalHeader, AdminModalTitle, AdminModalBody } from "@/features/admin/components/admin-modal";
import type { PageKind } from "@/types/pdf-menu";

const PAGE_TYPES: { kind: PageKind; extraTemplate?: string; label: string; hint: string }[] = [
  { kind: "blank", label: "صفحة فارغة", hint: "بدون محتوى — أضف فئات لاحقاً" },
  { kind: "content", label: "صفحة فئة", hint: "مخصصة لفئة واحدة" },
  { kind: "content", extraTemplate: "two-categories", label: "فئتان", hint: "تصميم فئتين في نفس الصفحة" },
  { kind: "offer", label: "صفحة عروض", hint: "أسعار كبيرة وصور بارزة" },
  { kind: "image", label: "صفحة صورة", hint: "تقسيم صورة + منتجات" },
  { kind: "custom", label: "صفحة مخصصة", hint: "تصميم حر" },
  { kind: "cover", label: "غلاف", hint: "صفحة غلاف يمكن نقلها" },
];

interface AddPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (kind: PageKind, pageTemplateId?: string) => void;
}

export function AddPageModal({ open, onOpenChange, onAdd }: AddPageModalProps) {
  return (
    <AdminModal open={open} onOpenChange={onOpenChange} size="md">
      <AdminModalHeader onClose={() => onOpenChange(false)}>
        <AdminModalTitle>إضافة صفحة</AdminModalTitle>
      </AdminModalHeader>
      <AdminModalBody>
        <div className="grid gap-2 sm:grid-cols-2">
          {PAGE_TYPES.map((item) => (
            <button
              key={`${item.kind}-${item.extraTemplate ?? ""}`}
              type="button"
              onClick={() => {
                onAdd(item.kind, item.extraTemplate);
                onOpenChange(false);
              }}
              className="rounded-xl border border-beige-dark/15 bg-white p-3 text-start hover:border-turquoise/40 hover:bg-turquoise/5"
            >
              <p className="text-sm font-bold text-dark-brown">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-coffee/50">{item.hint}</p>
            </button>
          ))}
        </div>
      </AdminModalBody>
    </AdminModal>
  );
}
