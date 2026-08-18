"use client";

import { AdminModal, AdminModalHeader, AdminModalTitle, AdminModalBody, AdminModalFooter } from "@/features/admin/components/admin-modal";
import { Button } from "@/components/ui/button";

interface DuplicatePageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "design" | "content") => void;
}

export function DuplicatePageModal({ open, onOpenChange, onConfirm }: DuplicatePageModalProps) {
  return (
    <AdminModal open={open} onOpenChange={onOpenChange} size="sm">
      <AdminModalHeader onClose={() => onOpenChange(false)}>
        <AdminModalTitle>نسخ الصفحة</AdminModalTitle>
      </AdminModalHeader>
      <AdminModalBody>
        <p className="text-sm text-coffee/70">كيف تريد نسخ هذه الصفحة؟</p>
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={() => { onConfirm("design"); onOpenChange(false); }}
            className="rounded-xl border border-beige-dark/15 p-3 text-start hover:border-turquoise/40"
          >
            <p className="text-sm font-bold text-dark-brown">التصميم فقط</p>
            <p className="text-[11px] text-coffee/50">ينسخ القالب والألوان بدون الفئات</p>
          </button>
          <button
            type="button"
            onClick={() => { onConfirm("content"); onOpenChange(false); }}
            className="rounded-xl border border-beige-dark/15 p-3 text-start hover:border-turquoise/40"
          >
            <p className="text-sm font-bold text-dark-brown">التصميم مع المحتوى</p>
            <p className="text-[11px] text-coffee/50">ينسخ الفئات والمنتجات أيضاً</p>
          </button>
        </div>
      </AdminModalBody>
      <AdminModalFooter>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>إلغاء</Button>
      </AdminModalFooter>
    </AdminModal>
  );
}
