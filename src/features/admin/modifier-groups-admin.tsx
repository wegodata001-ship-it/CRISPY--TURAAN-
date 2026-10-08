"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  useAllModifierOptions,
  useAllProductModifierGroups,
  useModifierGroups,
} from "@/hooks/useModifiers";
import { useProducts } from "@/hooks/useProducts";
import { deleteModifierGroup } from "@/services/modifierService";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import { AdminToastStack, createToast, type AdminToast } from "./components/admin-toast";
import { GroupBuilderDrawer } from "./modifier-groups/group-builder-drawer";
import { GroupCard } from "./modifier-groups/group-card";
import { AssignProductsDialog } from "./modifier-groups/assign-products-dialog";
import type { ModifierGroup } from "@/types/modifiers";

export function ModifierGroupsAdmin() {
  const t = useT();
  const { groups, loading } = useModifierGroups();
  const { options, error: optionsError } = useAllModifierOptions();
  const { links } = useAllProductModifierGroups();
  const { products } = useProducts(undefined, { admin: true });
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<ModifierGroup | null>(null);
  const [assigning, setAssigning] = useState<ModifierGroup | null>(null);
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const pushToast = useCallback((toast: AdminToast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const notify = useCallback(
    (message: string, type?: "error") => {
      pushToast(createToast(message, type === "error" ? "error" : undefined));
    },
    [pushToast]
  );

  const optionsByGroup = useMemo(() => {
    const map = new Map<string, typeof options>();
    for (const option of options) {
      const list = map.get(option.groupId) ?? [];
      list.push(option);
      map.set(option.groupId, list);
    }
    return map;
  }, [options]);

  const openCreate = () => {
    setEditing(null);
    setBuilderOpen(true);
  };

  const openEdit = (group: ModifierGroup) => {
    setEditing(group);
    setBuilderOpen(true);
  };

  const handleArchive = async (group: ModifierGroup) => {
    if (!confirm(t("admin.modifiers.deleteGroupConfirm"))) return;
    const result = await deleteModifierGroup(group.id);
    if (result.success) notify(t("admin.modifiers.groupDeleted"));
    else notify(result.error, "error");
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

      {optionsError && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{optionsError}</p>
      )}

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-beige-dark/30 py-12 text-center text-sm text-coffee/50">
          {t("admin.modifiers.noGroups")}
        </p>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              options={optionsByGroup.get(group.id) ?? []}
              products={products}
              links={links}
              onEdit={() => openEdit(group)}
              onAssign={() => setAssigning(group)}
              onArchive={() => void handleArchive(group)}
              onToast={notify}
            />
          ))}
        </div>
      )}

      <GroupBuilderDrawer
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        editing={editing}
        existingOptions={editing ? optionsByGroup.get(editing.id) ?? [] : []}
        sortOrder={groups.length}
        onSaved={() => notify(t("admin.modifiers.groupSaved"))}
        onError={(message) => notify(message, "error")}
      />

      <AssignProductsDialog
        open={Boolean(assigning)}
        onOpenChange={(open) => {
          if (!open) setAssigning(null);
        }}
        group={assigning}
        links={links}
        onSaved={() => notify(t("admin.modifiers.assignSaved"))}
        onError={(message) => notify(message, "error")}
      />

      <AdminToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
}
