"use client";

import { useCallback, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useModifierGroups } from "@/hooks/useModifiers";
import {
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
} from "@/services/modifierService";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import { AdminToastStack, createToast, type AdminToast } from "./components/admin-toast";
import { GroupFormDialog } from "./modifier-groups/group-form-dialog";
import { GroupOptionsManager } from "./modifier-groups/group-options-manager";
import type { ModifierGroupInput } from "@/lib/validation/modifier-schemas";
import type { ModifierGroup } from "@/types/modifiers";

export function ModifierGroupsAdmin() {
  const t = useT();
  const { groups, loading } = useModifierGroups();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ModifierGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoOpenAddForGroup, setAutoOpenAddForGroup] = useState<string | null>(null);
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const pushToast = useCallback((toast: AdminToast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (group: ModifierGroup) => {
    setEditing(group);
    setFormOpen(true);
  };

  const handleSave = async (payload: ModifierGroupInput): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);

    const result = editing
      ? await updateModifierGroup(editing.id, payload)
      : await createModifierGroup(payload);

    setSaving(false);

    if (!result.success) {
      pushToast(createToast(result.error, "error"));
      return false;
    }

    pushToast(createToast(t("admin.modifiers.groupSaved")));
    setFormOpen(false);

    if (!editing) {
      setAutoOpenAddForGroup(result.data.id);
      requestAnimationFrame(() => {
        document.getElementById(`modifier-group-${result.data.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }

    return true;
  };

  const handleDelete = async (group: ModifierGroup) => {
    if (!confirm(t("admin.modifiers.deleteGroupConfirm"))) return;
    const result = await deleteModifierGroup(group.id);
    if (result.success) {
      pushToast(createToast(t("admin.modifiers.groupDeleted")));
    } else {
      pushToast(createToast(result.error, "error"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.modifiers.title")}
        subtitle={t("admin.modifiers.subtitle")}
        actions={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4" />
            {t("admin.modifiers.newGroup")}
          </Button>
        }
      />

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-beige-dark/30 py-12 text-center text-sm text-coffee/50">
          {t("admin.modifiers.noGroups")}
        </p>
      ) : (
        <div className="divide-y divide-beige-dark/20 rounded-2xl border border-beige-dark/20 bg-warm-white dark:divide-white/10 dark:border-white/10 dark:bg-[#1a1412]/40">
          {groups.map((group) => (
            <GroupOptionsManager
              key={group.id}
              group={group}
              onToast={pushToast}
              onEditGroup={() => openEdit(group)}
              onDeleteGroup={() => void handleDelete(group)}
              autoOpenAdd={autoOpenAddForGroup === group.id}
              onAutoOpenAddHandled={() => setAutoOpenAddForGroup(null)}
            />
          ))}
        </div>
      )}

      <GroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        sortOrder={groups.length + 1}
        saving={saving}
        onSave={handleSave}
      />

      <AdminToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
