"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useAllCategories, useProducts } from "@/hooks/useProducts";
import {
  useCategoryModifierGroups,
  useModifierGroups,
  useModifierOptions,
} from "@/hooks/useModifiers";
import { syncCategoryModifierLinks } from "@/services/modifierService";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import {
  AdminToastStack,
  createToast,
  type AdminToast,
} from "@/features/admin/components/admin-toast";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import { CategorySearchSelect } from "./product-form/category-search-select";
import { countActiveProductsInCategoryTree } from "@/lib/product-builder/category-addons";
import { isVisibleRecord } from "@/lib/product-builder/visibility";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import { formatAddonPriceDelta } from "@/lib/validation/addon-group-builder";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import type { ModifierGroup, ModifierOption } from "@/types/modifiers";

type Assignment = {
  categoryId: string;
  groupIds: string[];
};

export function BusinessRulesAdmin() {
  return <CategoryAddonsAdmin />;
}

export function CategoryAddonsAdmin() {
  const t = useT();
  const { locale } = useLocale();
  const { categories, loading: categoriesLoading } = useAllCategories();
  const { products } = useProducts(undefined, { admin: true });
  const { groups, loading: groupsLoading } = useModifierGroups();
  const { options } = useModifierOptions();
  const { links, loading: linksLoading } = useCategoryModifierGroups();
  const [open, setOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const assignableGroups = useMemo(
    () =>
      groups
        .filter((group) => isVisibleRecord(group) && !group.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [groups]
  );

  const optionsByGroup = useMemo(() => {
    const map = new Map<string, ModifierOption[]>();
    for (const option of options) {
      if (!isVisibleRecord(option)) continue;
      const list = map.get(option.groupId) ?? [];
      list.push(option);
      map.set(option.groupId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [options]);

  const assignments = useMemo(() => {
    const byCategory = new Map<string, string[]>();
    for (const link of [...links]
      .filter((item) => item.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)) {
      const current = byCategory.get(link.categoryId) ?? [];
      if (!current.includes(link.groupId)) current.push(link.groupId);
      byCategory.set(link.categoryId, current);
    }
    return [...byCategory.entries()]
      .map(([id, groupIds]) => ({ categoryId: id, groupIds }))
      .sort((a, b) => {
        const left = categories.find((category) => category.id === a.categoryId)?.sortOrder ?? 0;
        const right = categories.find((category) => category.id === b.categoryId)?.sortOrder ?? 0;
        return left - right;
      });
  }, [links, categories]);

  const assignedCategoryIds = useMemo(
    () => new Set(assignments.map((item) => item.categoryId)),
    [assignments]
  );

  const selectableCategories = useMemo(() => {
    if (editingCategoryId) {
      return categories.filter((category) => category.id === editingCategoryId);
    }
    return categories.filter((category) => category.active !== false);
  }, [categories, editingCategoryId]);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const selectedGroups = selectedGroupIds
    .map((id) => assignableGroups.find((group) => group.id === id))
    .filter(Boolean) as ModifierGroup[];

  const openCreate = () => {
    setEditingCategoryId(null);
    setCategoryId("");
    setSelectedGroupIds([]);
    setOpen(true);
  };

  const openEdit = (assignment: Assignment) => {
    setEditingCategoryId(assignment.categoryId);
    setCategoryId(assignment.categoryId);
    setSelectedGroupIds(assignment.groupIds);
    setOpen(true);
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    );
  };

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const existing = assignments.find((item) => item.categoryId === id);
    setSelectedGroupIds(existing?.groupIds ?? []);
  };

  const saveAssignment = async () => {
    if (!categoryId || saving) return;
    setSaving(true);
    try {
      const result = await syncCategoryModifierLinks(categoryId, selectedGroupIds);
      if (!result.success) {
        setToasts((current) => [...current, createToast(result.error, "error")]);
        return;
      }
      setOpen(false);
      setToasts((current) => [...current, createToast(t("admin.categoryAddons.saved"))]);
    } finally {
      setSaving(false);
    }
  };

  if (categoriesLoading || groupsLoading || linksLoading) {
    return (
      <div className="grid min-h-64 place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-crispy-red" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <AdminPageHeader
        title={t("admin.categoryAddons.title")}
        subtitle={t("admin.categoryAddons.subtitle")}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("admin.categoryAddons.new")}
          </Button>
        }
      />

      {assignments.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-beige-dark/30 bg-warm-white p-12 text-center">
          <p className="font-semibold">{t("admin.categoryAddons.emptyTitle")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-coffee/55">
            {t("admin.categoryAddons.subtitle")}
          </p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("admin.categoryAddons.new")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => {
            const category = categories.find((item) => item.id === assignment.categoryId);
            const affected = countActiveProductsInCategoryTree(
              products,
              assignment.categoryId,
              categories
            );
            return (
              <article
                key={assignment.categoryId}
                className="rounded-2xl border border-beige-dark/15 bg-warm-white p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-dark-brown">
                      {categoryGlyph(category?.icon)}
                      {category ? getLocalizedName(category, locale) : assignment.categoryId}
                    </h2>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 text-coffee"
                    onClick={() => openEdit(assignment)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("admin.action.edit")}
                  </Button>
                </div>
                <p className="mt-3 text-xs font-medium text-coffee/50">
                  {t("admin.categoryAddons.optionsLabel")}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {assignment.groupIds.map((groupId) => {
                    const group = groups.find((item) => item.id === groupId);
                    return (
                      <span
                        key={groupId}
                        className="rounded-full bg-crispy-yellow/70 px-2.5 py-1 text-xs font-medium text-dark-brown"
                      >
                        {group ? getLocalizedName(group, locale) : groupId}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-coffee/50">
                  {t("admin.categoryAddons.productsAffected").replace("{count}", String(affected))}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <AdminModal open={open} onOpenChange={setOpen} size="lg">
        <AdminModalHeader onClose={() => setOpen(false)}>
          <AdminModalTitle>{t("admin.categoryAddons.modalTitle")}</AdminModalTitle>
        </AdminModalHeader>
        <AdminModalBody className="space-y-6">
          <section className="space-y-2">
            <p className="text-sm font-semibold text-dark-brown">
              1. {t("admin.categoryAddons.pickCategory")}
            </p>
            {editingCategoryId && selectedCategory ? (
              <div className="rounded-xl border border-beige-dark/20 bg-beige/20 px-4 py-3 text-sm font-medium">
                {categoryGlyph(selectedCategory.icon)}
                {getLocalizedName(selectedCategory, locale)}
              </div>
            ) : (
              <CategorySearchSelect
                categories={selectableCategories}
                value={categoryId}
                onChange={handleCategoryChange}
                placeholder={t("admin.categoryAddons.searchCategory")}
                emptyLabel={t("admin.categoryAddons.noCategories")}
              />
            )}
            {categoryId && assignedCategoryIds.has(categoryId) && !editingCategoryId ? (
              <p className="text-xs text-coffee/55">{t("admin.categoryAddons.existingHint")}</p>
            ) : null}
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold text-dark-brown">
              2. {t("admin.categoryAddons.whichOptions")}
            </p>
            {assignableGroups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-beige-dark/30 px-4 py-6 text-center text-sm text-coffee/50">
                {t("admin.categoryAddons.noGroups")}
              </p>
            ) : (
              <div className="grid gap-2">
                {assignableGroups.map((group) => {
                  const groupOptions = optionsByGroup.get(group.id) ?? [];
                  const checked = selectedGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-2xl border px-3 py-3 transition-colors",
                        checked
                          ? "border-crispy-red/40 bg-crispy-yellow/20"
                          : "border-beige-dark/15 bg-warm-white hover:bg-beige/20"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroup(group.id)}
                        className="mt-1 rounded accent-crispy-red"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-dark-brown">
                          {getLocalizedName(group, locale)}
                        </p>
                        <p className="text-xs text-coffee/50">
                          {t("admin.modifiers.optionCount").replace(
                            "{count}",
                            String(groupOptions.length)
                          )}
                        </p>
                        {groupOptions.length > 0 ? (
                          <p className="mt-1 truncate text-xs text-coffee/70">
                            {groupOptions
                              .slice(0, 4)
                              .map((option) => getLocalizedName(option, locale))
                              .join(" • ")}
                            {groupOptions.length > 4 ? "…" : ""}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {selectedCategory && selectedGroups.length > 0 ? (
            <CustomerPreview
              category={selectedCategory}
              groups={selectedGroups}
              optionsByGroup={optionsByGroup}
            />
          ) : null}
        </AdminModalBody>
        <AdminModalFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t("admin.action.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!categoryId || saving}
            onClick={() => void saveAssignment()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("admin.categoryAddons.save")}
          </Button>
        </AdminModalFooter>
      </AdminModal>

      <AdminToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}

function categoryGlyph(icon?: string) {
  if (!icon) return "";
  if (icon.length <= 4 || /\p{Extended_Pictographic}/u.test(icon)) return `${icon} `;
  return "";
}

function CustomerPreview({
  category,
  groups,
  optionsByGroup,
}: {
  category: Category;
  groups: ModifierGroup[];
  optionsByGroup: Map<string, ModifierOption[]>;
}) {
  const t = useT();
  const { locale } = useLocale();

  return (
    <section className="rounded-2xl border border-beige-dark/15 bg-cream p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-coffee/50">
        {t("admin.categoryAddons.preview")}
      </p>
      <p className="mt-1 text-sm text-coffee/70">
        {getLocalizedName(category, locale)}
      </p>
      <div className="mt-3 space-y-4">
        {groups.map((group) => {
          const groupOptions = optionsByGroup.get(group.id) ?? [];
          if (groupOptions.length === 0) return null;
          return (
            <div key={group.id} className="rounded-xl bg-warm-white p-3">
              <p className="font-semibold text-dark-brown">{getLocalizedName(group, locale)}</p>
              <p className="text-xs text-coffee/50">
                {group.requirement === "required"
                  ? t("admin.categoryAddons.chooseRequired")
                  : t("admin.categoryAddons.chooseOptional")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {groupOptions.map((option) => (
                  <li
                    key={option.id}
                    className="flex items-center justify-between gap-3 text-sm text-dark-brown"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 rounded-full border border-coffee/30" />
                      {getLocalizedName(option, locale)}
                    </span>
                    {option.priceDelta > 0 ? (
                      <span className="text-xs text-coffee/60">
                        {formatAddonPriceDelta(option.priceDelta)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
