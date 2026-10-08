"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { formatAddonPriceDelta } from "@/lib/validation/addon-group-builder";
import { normalizeModifierOptionInput } from "@/lib/validation/modifier-normalize";
import {
  createModifierOption,
  updateModifierOption,
  deleteModifierOption,
} from "@/services/modifierService";
import type { ModifierGroup, ModifierOption, ProductModifierGroup } from "@/types/modifiers";
import type { Product } from "@/types";

function productLabel(product: Product | undefined, locale: string) {
  if (!product) return "";
  if (locale === "ar") return product.name_ar || product.name_he || product.name_en;
  if (locale === "en") return product.name_en || product.name_he || product.name_ar;
  return product.name_he || product.name_ar || product.name_en;
}

interface GroupCardProps {
  group: ModifierGroup;
  options: ModifierOption[];
  products: Product[];
  links: ProductModifierGroup[];
  onEdit: () => void;
  onAssign: () => void;
  onArchive: () => void;
  onToast: (message: string, type?: "error") => void;
}

export function GroupCard({
  group,
  options,
  products,
  links,
  onEdit,
  onAssign,
  onArchive,
  onToast,
}: GroupCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState(0);
  const [saving, setSaving] = useState(false);

  const sorted = [...options].sort((a, b) => a.sortOrder - b.sortOrder);
  const assigned = links
    .filter((link) => link.groupId === group.id && link.active)
    .map((link) => products.find((product) => product.id === link.productId))
    .filter(Boolean) as Product[];

  const isSingle = group.selectionType === "single" || group.maxSelections === 1;
  const required = group.requirement === "required";

  const startEdit = (option: ModifierOption) => {
    setAdding(false);
    setEditingId(option.id);
    setEditName(option.name_he || option.name_ar || option.name_en);
    setEditPrice(option.priceDelta);
  };

  const saveEdit = async () => {
    if (!editingId || saving) return;
    if (!editName.trim()) {
      onToast(t("admin.modifiers.optionNameMissing"), "error");
      return;
    }
    setSaving(true);
    const result = await updateModifierOption(
      editingId,
      normalizeModifierOptionInput({
        groupId: group.id,
        nameHe: editName,
        priceDelta: Math.max(0, editPrice),
      })
    );
    setSaving(false);
    if (!result.success) {
      onToast(result.error, "error");
      return;
    }
    onToast(t("admin.modifiers.optionSaved"));
    setEditingId(null);
  };

  const saveAdd = async () => {
    if (saving) return;
    if (!addName.trim()) {
      onToast(t("admin.modifiers.optionNameMissing"), "error");
      return;
    }
    setSaving(true);
    const result = await createModifierOption(
      normalizeModifierOptionInput({
        groupId: group.id,
        nameHe: addName,
        priceDelta: Math.max(0, addPrice),
        sortOrder: sorted.length,
        active: true,
        archived: false,
      })
    );
    setSaving(false);
    if (!result.success) {
      onToast(result.error, "error");
      return;
    }
    onToast(t("admin.modifiers.optionSaved"));
    setAdding(false);
    setAddName("");
    setAddPrice(0);
  };

  const archiveOption = async (option: ModifierOption) => {
    if (!confirm(t("admin.modifiers.deleteOptionConfirm"))) return;
    const result = await deleteModifierOption(option.id);
    if (result.success) onToast(t("admin.modifiers.optionDeleted"));
    else onToast(result.error, "error");
  };

  return (
    <article
      data-testid="addon-group-card"
      className="rounded-2xl border border-beige-dark/20 bg-warm-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1412]/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold dark:text-warm-white" dir="rtl">
            {group.name_he || group.name_ar || group.name_en}
          </h2>
          <p className="mt-0.5 text-sm text-coffee/55">
            {required ? `${t("admin.modifiers.requiredDot")} • ` : ""}
            {isSingle
              ? t("admin.modifiers.singleSummary")
              : t("admin.modifiers.rangeSummary")
                  .replace("{min}", String(group.minSelections))
                  .replace("{max}", String(group.maxSelections))}
          </p>
        </div>
        <div className="relative flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 hover:bg-beige/40 dark:hover:bg-white/10"
            title={t("admin.action.edit")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-2 hover:bg-beige/40 dark:hover:bg-white/10"
            aria-label="menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute end-0 top-10 z-20 min-w-40 rounded-xl border border-beige-dark/20 bg-white py-1 shadow-elevated dark:border-white/10 dark:bg-[#1a1412]">
              <button
                type="button"
                className="block w-full px-3 py-2 text-start text-sm hover:bg-beige/40"
                onClick={() => {
                  setMenuOpen(false);
                  onAssign();
                }}
              >
                {t("admin.modifiers.assignProducts")}
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-start text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  onArchive();
                }}
              >
                {t("admin.modifiers.archiveGroup")}
              </button>
            </div>
          )}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {sorted.map((option) =>
          editingId === option.id ? (
            <li
              key={option.id}
              className="flex w-full flex-col gap-2 rounded-xl border border-turquoise/30 bg-turquoise/5 p-2 sm:flex-row sm:items-center"
            >
              <Input
                dir="rtl"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
              <div className="flex items-center gap-1 rounded-xl border border-beige-dark/20 px-2">
                <span className="text-xs text-coffee/45" dir="ltr">
                  ₪
                </span>
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  dir="ltr"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="h-10 w-20 border-0 bg-transparent tabular-nums shadow-none"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="rounded-xl" disabled={saving} onClick={() => void saveEdit()}>
                  {t("admin.action.save")}
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setEditingId(null)}>
                  {t("admin.action.cancel")}
                </Button>
              </div>
            </li>
          ) : (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => startEdit(option)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  void archiveOption(option);
                }}
                className="rounded-xl border border-beige-dark/15 bg-beige/20 px-3 py-2 text-start hover:border-turquoise/40 dark:border-white/10 dark:bg-white/5"
              >
                <span className="block text-sm font-medium dark:text-warm-white">
                  {option.name_he || option.name_ar || option.name_en}
                </span>
                <span className="text-xs tabular-nums text-coffee/55" dir="ltr">
                  {formatAddonPriceDelta(option.priceDelta)}
                </span>
              </button>
            </li>
          )
        )}
      </ul>

      {sorted.length === 0 && (
        <p className="mt-3 text-xs font-medium text-amber-700">
          {t("admin.builder.emptyGroupWarning")}
        </p>
      )}

      {adding && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-dashed border-turquoise/40 p-2 sm:flex-row sm:items-center">
          <Input
            dir="rtl"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder={t("admin.modifiers.optionName")}
            className="rounded-xl"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveAdd();
              }
            }}
          />
          <div className="flex items-center gap-1 rounded-xl border border-beige-dark/20 px-2">
            <span className="text-xs text-coffee/45" dir="ltr">
              ₪
            </span>
            <Input
              type="number"
              min={0}
              step="0.5"
              dir="ltr"
              value={addPrice}
              onChange={(e) => setAddPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              className="h-10 w-20 border-0 bg-transparent tabular-nums shadow-none"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="rounded-xl" disabled={saving} onClick={() => void saveAdd()}>
              {t("admin.action.save")}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setAdding(false)}>
              {t("admin.action.cancel")}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-coffee/45">
          {t("admin.modifiers.optionCount").replace("{count}", String(sorted.length))}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("admin.modifiers.quickAdd")}
        </Button>
      </div>

      {assigned.length > 0 && (
        <p className="mt-3 text-xs text-coffee/50">
          {t("admin.modifiers.linkedTo")}:{" "}
          {assigned.map((product) => productLabel(product, locale)).join(" · ")}
        </p>
      )}
    </article>
  );
}
