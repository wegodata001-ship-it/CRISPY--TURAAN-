"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModifierOptions } from "@/hooks/useModifiers";
import { createModifierGroup, createModifierOption, deleteModifierOption } from "@/services";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import {
  normalizeModifierGroupInput,
  normalizeModifierOptionInput,
} from "@/lib/validation/modifier-normalize";
import type { ModifierGroup } from "@/types/modifiers";

function GroupOptionsEditor({
  group,
  defaultExpanded,
}: {
  group: ModifierGroup;
  defaultExpanded?: boolean;
}) {
  const t = useT();
  const { options, loading } = useModifierOptions(group.id);
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddOption = async () => {
    const nameHe = newName.trim();
    if (!nameHe || adding) return;
    setAdding(true);
    setError(null);
    const result = await createModifierOption(
      normalizeModifierOptionInput({
        groupId: group.id,
        nameHe,
        priceDelta: parseFloat(newPrice) || 0,
        sortOrder: options.length + 1,
        active: true,
        archived: false,
      })
    );
    setAdding(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setNewName("");
    setNewPrice("");
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm(t("admin.modifiers.deleteOptionConfirm"))) return;
    await deleteModifierOption(optionId);
  };

  return (
    <div className="rounded-xl border border-beige-dark/20 bg-cream/30 dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Layers className="h-4 w-4 shrink-0 text-turquoise" strokeWidth={1.75} />
          <span className="truncate text-sm font-semibold dark:text-warm-white" dir="rtl">
            {group.name_he}
          </span>
          <span className="text-caption shrink-0 rounded-full bg-beige/60 px-2 py-0.5 text-[10px]">
            {group.selectionType === "multiple"
              ? t("admin.modifiers.selectionMultiple")
              : t("admin.modifiers.selectionSingle")}
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-coffee/40 transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <div className="border-t border-beige-dark/15 px-4 pb-4 pt-3">
          {loading ? (
            <p className="text-xs text-coffee/50">{t("admin.modifiers.loadingOptions")}</p>
          ) : options.length === 0 ? (
            <p className="mb-3 text-xs text-coffee/45">{t("admin.modifiers.noOptions")}</p>
          ) : (
            <ul className="mb-3 space-y-1.5">
              {options.map((opt) => (
                <li
                  key={opt.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-warm-white px-3 py-2 dark:bg-[#1a1412]/60"
                >
                  <span className="text-sm dark:text-warm-white" dir="rtl">
                    {opt.name_he}
                    {opt.priceDelta > 0 && (
                      <span className="ms-2 text-xs text-coffee/45">+₪{opt.priceDelta}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteOption(opt.id)}
                    className="rounded p-1 text-coffee/35 hover:text-red-500"
                    aria-label={t("admin.action.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px] flex-1">
              <Label className="text-xs">{t("admin.productForm.optionName")}</Label>
              <Input
                dir="rtl"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("admin.productForm.optionNamePlaceholder")}
                className="mt-1 h-9 rounded-lg text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAddOption();
                  }
                }}
              />
            </div>
            <div className="w-20">
              <Label className="text-xs">{t("admin.modifiers.priceDelta")}</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0"
                className="mt-1 h-9 rounded-lg text-sm"
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-lg px-3"
              disabled={adding || !newName.trim()}
              onClick={() => void handleAddOption()}
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

interface ProductModifiersPanelProps {
  productId: string | null;
  allGroups: ModifierGroup[];
  linkedGroupIds: string[];
  onLinkedChange: (ids: string[]) => void;
}

export function ProductModifiersPanel({
  productId,
  allGroups,
  linkedGroupIds,
  onLinkedChange,
}: ProductModifiersPanelProps) {
  const t = useT();
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectionType, setSelectionType] = useState<"single" | "multiple">("multiple");
  const [required, setRequired] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [extraGroups, setExtraGroups] = useState<ModifierGroup[]>([]);

  const mergedGroups = useMemo(() => {
    const byId = new Map(allGroups.map((g) => [g.id, g]));
    for (const g of extraGroups) byId.set(g.id, g);
    return [...byId.values()];
  }, [allGroups, extraGroups]);

  const linkedGroups = linkedGroupIds
    .map((id) => mergedGroups.find((g) => g.id === id))
    .filter(Boolean) as ModifierGroup[];

  const unlinkedGroups = mergedGroups.filter((g) => !linkedGroupIds.includes(g.id));

  const toggleLink = (groupId: string) => {
    if (linkedGroupIds.includes(groupId)) {
      onLinkedChange(linkedGroupIds.filter((id) => id !== groupId));
    } else {
      onLinkedChange([...linkedGroupIds, groupId]);
    }
  };

  const handleCreateGroup = async () => {
    const nameHe = groupName.trim();
    if (!nameHe || creating) return;
    setCreating(true);
    setCreateError(null);

    const result = await createModifierGroup(
      normalizeModifierGroupInput({
        nameHe,
        selectionType,
        requirement: required ? "required" : "optional",
        minSelections: selectionType === "multiple" ? 0 : 0,
        maxSelections: selectionType === "multiple" ? 5 : 1,
        sortOrder: mergedGroups.length + 1,
        active: true,
        archived: false,
        displayType: "buttons",
      })
    );

    setCreating(false);
    if (!result.success) {
      setCreateError(result.error);
      return;
    }

    const id = result.data.id;
    setExtraGroups((prev) => [...prev.filter((g) => g.id !== id), result.data]);
    onLinkedChange([...linkedGroupIds, id]);
    setNewGroupId(id);
    setGroupName("");
  };

  return (
    <div className="space-y-4">
      {!productId && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          {t("admin.productForm.modifiersAfterSave")}
        </p>
      )}

      {/* Inline create group */}
      <div className="rounded-xl border border-turquoise/25 bg-turquoise/5 p-4 dark:bg-turquoise/10">
        <p className="mb-3 text-sm font-semibold text-dark-brown dark:text-warm-white">
          {t("admin.productForm.newModifierGroup")}
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">{t("admin.modifiers.nameHeRequired")}</Label>
            <Input
              dir="rtl"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("admin.productForm.groupNamePlaceholder")}
              className="mt-1 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateGroup();
                }
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectionType("single")}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                selectionType === "single"
                  ? "border-turquoise bg-warm-white text-turquoise"
                  : "border-beige-dark/25 text-coffee/60"
              )}
            >
              {t("admin.modifiers.selectionSingle")}
            </button>
            <button
              type="button"
              onClick={() => setSelectionType("multiple")}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                selectionType === "multiple"
                  ? "border-turquoise bg-warm-white text-turquoise"
                  : "border-beige-dark/25 text-coffee/60"
              )}
            >
              {t("admin.modifiers.selectionMultiple")}
            </button>
            <label className="flex items-center gap-2 rounded-lg border border-beige-dark/25 px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded"
              />
              {t("admin.modifiers.required")}
            </label>
          </div>

          <Button
            type="button"
            className="w-full rounded-xl sm:w-auto"
            disabled={creating || !groupName.trim()}
            onClick={() => void handleCreateGroup()}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {t("admin.productForm.createAndLinkGroup")}
              </>
            )}
          </Button>
          {createError && <p className="text-xs text-red-600">{createError}</p>}
        </div>
      </div>

      {/* Linked groups with options editor */}
      {linkedGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-coffee/45">
            {t("admin.productForm.linkedGroups")}
          </p>
          {linkedGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => toggleLink(group.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  {t("admin.productForm.unlinkGroup")}
                </button>
              </div>
              <GroupOptionsEditor
                group={group}
                defaultExpanded={group.id === newGroupId || linkedGroups.length === 1}
              />
            </div>
          ))}
        </div>
      )}

      {/* Link existing groups */}
      {unlinkedGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-coffee/45">
            {t("admin.productForm.otherGroups")}
          </p>
          {unlinkedGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-beige-dark/20 px-4 py-3 dark:border-white/10"
            >
              <span className="text-sm font-medium dark:text-warm-white" dir="rtl">
                {group.name_he}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-lg text-xs"
                onClick={() => toggleLink(group.id)}
              >
                <Plus className="h-3 w-3" />
                {t("admin.productForm.linkGroup")}
              </Button>
            </div>
          ))}
        </div>
      )}

      {mergedGroups.length === 0 && !creating && (
        <p className="text-center text-sm text-coffee/50">{t("admin.productForm.noModifierGroupsHint")}</p>
      )}
    </div>
  );
}
