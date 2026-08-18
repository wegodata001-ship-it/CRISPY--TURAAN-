"use client";

import { useState } from "react";
import { Plus, Copy, Trash2, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminModal, AdminModalHeader, AdminModalTitle, AdminModalBody, AdminModalFooter } from "@/features/admin/components/admin-modal";
import { cn } from "@/lib/utils";
import {
  getTemplates,
  createTemplate,
  duplicateTemplate,
  deleteTemplate,
} from "@/services/pdfMenuService";
import type { PdfMenuTemplate } from "@/types/pdf-menu";

interface TemplateManagerProps {
  templates: PdfMenuTemplate[];
  activeTemplate: PdfMenuTemplate | null;
  onSelect: (template: PdfMenuTemplate) => void;
  onRefresh: () => void;
}

export function TemplateManager({ templates, activeTemplate, onSelect, onRefresh }: TemplateManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const tmpl = await createTemplate(newName.trim());
      onSelect(tmpl);
      setShowCreate(false);
      setNewName("");
      onRefresh();
    } catch (err) {
      console.error("[TemplateManager] create error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setLoading(true);
    try {
      const name = `${templates.find((t) => t.id === id)?.name || "Menu"} (نسخة)`;
      const tmpl = await duplicateTemplate(id, name);
      onSelect(tmpl);
      onRefresh();
    } catch (err) {
      console.error("[TemplateManager] duplicate error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه القائمة؟ لا يمكن التراجع.")) return;
    setLoading(true);
    try {
      await deleteTemplate(id);
      onRefresh();
    } catch (err) {
      console.error("[TemplateManager] delete error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-coffee/50">القوائم</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-1">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => onSelect(tmpl)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
                activeTemplate?.id === tmpl.id
                  ? "bg-turquoise/10 text-turquoise"
                  : "hover:bg-beige/40 text-coffee/70"
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate text-xs font-medium">{tmpl.name}</span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(tmpl.id); }}
                  className="rounded p-1 text-coffee/30 hover:text-turquoise"
                >
                  <Copy className="h-3 w-3" />
                </button>
                {templates.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(tmpl.id); }}
                    className="rounded p-1 text-coffee/30 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AdminModal open={showCreate} onOpenChange={setShowCreate} size="sm">
        <AdminModalHeader onClose={() => setShowCreate(false)}>
          <AdminModalTitle>قائمة جديدة</AdminModalTitle>
        </AdminModalHeader>
        <AdminModalBody>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="اسم القائمة..."
            className="w-full rounded-lg border border-beige-dark/20 px-3 py-2.5 text-sm text-dark-brown placeholder:text-coffee/30 focus:border-turquoise focus:outline-none"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="turquoise" size="sm" onClick={handleCreate} disabled={!newName.trim() || loading}>
            {loading ? "جاري..." : "إنشاء"}
          </Button>
        </AdminModalFooter>
      </AdminModal>
    </>
  );
}
