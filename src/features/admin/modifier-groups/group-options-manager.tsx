"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useModifierOptions } from "@/hooks/useModifiers";
import {
  createModifierOption,
  updateModifierOption,
  deleteModifierOption,
} from "@/services/modifierService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import { useT } from "@/components/providers/locale-provider";
import { normalizeModifierOptionInput } from "@/lib/validation/modifier-normalize";
import type { ModifierGroup, ModifierOption } from "@/types/modifiers";
import { createToast, type AdminToast } from "../components/admin-toast";

interface GroupOptionsManagerProps {
  group: ModifierGroup;
  onToast: (toast: AdminToast) => void;
  onEditGroup?: () => void;
  onDeleteGroup?: () => void;
  autoOpenAdd?: boolean;
  onAutoOpenAddHandled?: () => void;
}

export function GroupOptionsManager({
  group,
  onToast,
  onEditGroup,
  onDeleteGroup,
  autoOpenAdd,
  onAutoOpenAddHandled,
}: GroupOptionsManagerProps) {
  const t = useT();
  const { options, loading } = useModifierOptions(group.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ModifierOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameHe, setNameHe] = useState("");
  const [priceDelta, setPriceDelta] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setNameHe("");
    setPriceDelta(0);
    setError(null);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (autoOpenAdd) {
      openAdd();
      onAutoOpenAddHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after create
  }, [autoOpenAdd]);

  const openEdit = (opt: ModifierOption) => {
    setEditing(opt);
    setNameHe(opt.name_he);
    setPriceDelta(opt.priceDelta);
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!nameHe.trim()) {
      setError(t("admin.modifiers.nameHeMissing"));
      return;
    }

    setSaving(true);
    setError(null);

    const payload = normalizeModifierOptionInput({
      groupId: group.id,
      nameHe,
      priceDelta,
      sortOrder: editing?.sortOrder ?? options.length + 1,
      active: true,
      archived: false,
    });

    const result = editing
      ? await updateModifierOption(editing.id, payload)
      : await createModifierOption(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error);
      onToast(createToast(t("admin.modifiers.optionSaveFailed"), "error"));
      return;
    }

    onToast(createToast(t("admin.modifiers.optionSaved")));
    setDialogOpen(false);
  };

  const handleDelete = async (opt: ModifierOption) => {
    if (!confirm(t("admin.modifiers.deleteOptionConfirm"))) return;
    const result = await deleteModifierOption(opt.id);
    if (result.success) {
      onToast(createToast(t("admin.modifiers.optionDeleted")));
    } else {
      onToast(createToast(result.error, "error"));
    }
  };

  const icon = group.icon || "📦";

  return (
    <section
      id={`modifier-group-${group.id}`}
      className="scroll-mt-24 px-5 py-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-lg font-bold dark:text-warm-white">
          <span>{icon}</span>
          <span dir="rtl">{group.name_he}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            {t("admin.modifiers.addOption")}
          </Button>
          {onEditGroup && (
            <button
              type="button"
              onClick={onEditGroup}
              className="rounded-lg p-2 hover:bg-beige/40 dark:hover:bg-white/10"
              title={t("admin.action.edit")}
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDeleteGroup && (
            <button
              type="button"
              onClick={onDeleteGroup}
              className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              title={t("admin.action.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-coffee/50">{t("admin.modifiers.loadingOptions")}</p>
      ) : options.length === 0 ? (
        <p className="rounded-xl bg-beige/30 px-4 py-6 text-center text-sm text-coffee/50 dark:bg-white/5">
          {t("admin.modifiers.noOptions")}
        </p>
      ) : (
        <ul className="space-y-2">
          {options.map((opt) => (
            <li
              key={opt.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-beige-dark/15 bg-warm-white px-4 py-3 dark:border-white/10 dark:bg-[#1a1412]/60"
            >
              <div className="min-w-0">
                <p className="font-medium dark:text-warm-white" dir="rtl">
                  {opt.name_he}
                </p>
                {opt.priceDelta > 0 && (
                  <p className="text-xs text-coffee/50">+₪{opt.priceDelta}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(opt)}
                  className="rounded-lg p-2 hover:bg-beige/40 dark:hover:bg-white/10"
                  title={t("admin.action.edit")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(opt)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  title={t("admin.action.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminModal open={dialogOpen} onOpenChange={setDialogOpen} size="sm">
        <div
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            }
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <AdminModalHeader onClose={() => setDialogOpen(false)}>
            <AdminModalTitle>
              {editing ? t("admin.modifiers.editOption") : t("admin.modifiers.newOption")}
            </AdminModalTitle>
          </AdminModalHeader>
          <AdminModalBody className="space-y-4">
            <div>
              <Label>{t("admin.modifiers.nameHeRequired")}</Label>
              <Input
                dir="rtl"
                autoFocus
                value={nameHe}
                onChange={(e) => setNameHe(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label>{t("admin.modifiers.priceDelta")}</Label>
              <Input
                type="number"
                step="0.5"
                min={0}
                value={priceDelta}
                onChange={(e) => setPriceDelta(parseFloat(e.target.value) || 0)}
                className="mt-1 rounded-xl"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </AdminModalBody>
          <AdminModalFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
            >
              {t("admin.action.cancel")}
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.action.save")}
            </Button>
          </AdminModalFooter>
        </div>
      </AdminModal>
    </section>
  );
}
