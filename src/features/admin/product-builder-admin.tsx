"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Unlink,
} from "lucide-react";
import { useAllCategories, useProducts } from "@/hooks/useProducts";
import {
  useAllProductModifierGroups,
  useModifierGroups,
  useProductBuilderConfig,
} from "@/hooks/useModifiers";
import {
  createModifierGroup,
  syncProductModifierLinks,
} from "@/services/modifierService";
import { ProductBuilderPreview } from "@/features/catalog/product-builder";
import { SortableList } from "@/components/admin/sortable-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProductImage } from "@/lib/menu/placeholders";
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
import { useT } from "@/components/providers/locale-provider";
import { useAdminPath } from "@/hooks/useAdminPath";
import { AdminPageHeader } from "./components/admin-page-header";
import { normalizeModifierGroupInput } from "@/lib/validation/modifier-normalize";
import type { ModifierGroup, ProductModifierGroup } from "@/types/modifiers";
import { cn } from "@/lib/utils";

type DraftLink = ProductModifierGroup;

const SELECTION_TYPE_KEYS = {
  single: "admin.modifiers.selectionSingle",
  multiple: "admin.modifiers.selectionMultiple",
  quantity: "admin.modifiers.selectionQuantity",
  counter: "admin.modifiers.selectionCounter",
} as const;

export function ProductBuilderAdmin() {
  const t = useT();
  const adminPath = useAdminPath();
  const { products, loading: productsLoading } = useProducts(undefined, { admin: true });
  const { categories } = useAllCategories();
  const { groups, loading: groupsLoading } = useModifierGroups();
  const { links: allLinks, loading: linksLoading } = useAllProductModifierGroups();
  const [productId, setProductId] = useState("");
  const [search, setSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [draftLinks, setDraftLinks] = useState<DraftLink[]>([]);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSelection, setNewGroupSelection] = useState<"single" | "multiple">("single");
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [removeLink, setRemoveLink] = useState<DraftLink | null>(null);
  const [editLink, setEditLink] = useState<DraftLink | null>(null);
  const [editRequirement, setEditRequirement] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const [localGroups, setLocalGroups] = useState<ModifierGroup[]>([]);
  const { config } = useProductBuilderConfig(previewOpen && productId ? productId : null);

  const product = products.find((item) => item.id === productId);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const groupById = useMemo(() => {
    const map = new Map(groups.map((group) => [group.id, group]));
    localGroups.forEach((group) => map.set(group.id, group));
    return map;
  }, [groups, localGroups]);
  const linkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allLinks.forEach((link) => {
      if (link.active) counts.set(link.productId, (counts.get(link.productId) ?? 0) + 1);
    });
    return counts;
  }, [allLinks]);
  const persistedLinks = useMemo(
    () =>
      allLinks
        .filter((link) => link.productId === productId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [allLinks, productId]
  );

  useEffect(() => {
    dirtyRef.current = false;
    setDirty(false);
    setDraftLinks(persistedLinks);
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirtyRef.current) setDraftLinks(persistedLinks);
  }, [persistedLinks]);

  const updateDraft = (updater: (current: DraftLink[]) => DraftLink[]) => {
    setDraftLinks(updater);
    dirtyRef.current = true;
    setDirty(true);
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return products;
    return products.filter((item) =>
      [item.name_he, item.name_ar, item.name_en]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query)
    );
  }, [products, search]);

  const linkedGroupIds = useMemo(
    () => new Set(draftLinks.map((link) => link.groupId)),
    [draftLinks]
  );
  const unlinkedGroups = groups.filter(
    (group) =>
      !linkedGroupIds.has(group.id) &&
      !group.archived &&
      group.active
  );
  const availableGroups = unlinkedGroups.filter(
    (group) =>
      [group.name_he, group.name_ar, group.name_en]
        .join(" ")
        .toLocaleLowerCase()
        .includes(groupSearch.trim().toLocaleLowerCase())
  );

  const resetCreateForm = () => {
    setCreateMode(false);
    setCreating(false);
    setNewGroupName("");
    setNewGroupSelection("single");
    setNewGroupRequired(false);
    setCreateError(null);
  };

  const openAddGroups = () => {
    setSelectedGroupIds(new Set());
    setGroupSearch("");
    resetCreateForm();
    setLinkOpen(true);
  };

  const addSelectedGroups = () => {
    const selected = groups.filter((group) => selectedGroupIds.has(group.id));
    updateDraft((current) => [
      ...current,
      ...selected.map((group, index) => ({
        id: `draft-${group.id}`,
        productId,
        groupId: group.id,
        sortOrder: current.length + index + 1,
        active: true,
      })),
    ]);
    setLinkOpen(false);
    resetCreateForm();
  };

  const createAndAssignGroup = async () => {
    const nameHe = newGroupName.trim();
    if (!nameHe) {
      setCreateError(t("admin.modifiers.nameHeMissing"));
      return;
    }
    if (creating) return;
    setCreating(true);
    setCreateError(null);

    const result = await createModifierGroup(
      normalizeModifierGroupInput({
        nameHe,
        selectionType: newGroupSelection,
        requirement: newGroupRequired ? "required" : "optional",
        minSelections: newGroupRequired ? 1 : 0,
        maxSelections: newGroupSelection === "multiple" ? 3 : 1,
        sortOrder: groups.length + 1,
        active: true,
        archived: false,
        displayType: "buttons",
      })
    );

    setCreating(false);

    if (!result.success) {
      setCreateError(result.error);
      setToasts((current) => [...current, createToast(result.error, "error")]);
      return;
    }

    const group = result.data;
    setLocalGroups((current) =>
      current.some((item) => item.id === group.id) ? current : [...current, group]
    );
    updateDraft((current) => [
      ...current,
      {
        id: `draft-${group.id}`,
        productId,
        groupId: group.id,
        sortOrder: current.length + 1,
        active: true,
      },
    ]);
    setToasts((current) => [
      ...current,
      createToast(t("admin.builder.groupCreated")),
    ]);
    setLinkOpen(false);
    resetCreateForm();
  };

  const save = async () => {
    if (!productId || saving || !dirty) return;
    setSaving(true);
    try {
      const result = await syncProductModifierLinks(
        productId,
        draftLinks.map((link) => ({
          groupId: link.groupId,
          requirement: link.requirement,
          selectionType: link.selectionType,
          displayType: link.displayType,
          active: link.active,
        }))
      );
      if (!result.success) {
        setToasts((current) => [...current, createToast(result.error, "error")]);
        return;
      }
      dirtyRef.current = false;
      setDirty(false);
      setToasts((current) => [
        ...current,
        createToast(t("admin.builder.assignmentsSaved")),
      ]);
    } finally {
      setSaving(false);
    }
  };

  const loading = productsLoading || groupsLoading || linksLoading;
  if (loading) {
    return (
      <div className="grid min-h-64 place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-turquoise" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <AdminPageHeader
        title={t("admin.builder.assignmentTitle")}
        subtitle={t("admin.builder.assignmentSubtitle")}
        actions={
          <Button onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t("admin.productForm.saving") : t("admin.action.save")}
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[20px] border border-beige-dark/15 bg-warm-white p-4 shadow-soft lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold">{t("admin.builder.selectProduct")}</h2>
          <div className="relative mt-3">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("admin.builder.searchProducts")}
              className="h-11 ps-10"
            />
          </div>
          <div className="mt-3 max-h-[min(65dvh,620px)] space-y-2 overflow-y-auto">
            {filteredProducts.map((item) => {
              const category = categoryById.get(item.categoryId);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProductId(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-2.5 text-start transition-colors",
                    productId === item.id
                      ? "border-turquoise bg-turquoise/10"
                      : "border-transparent hover:bg-beige/30"
                  )}
                >
                  <span
                    className="h-11 w-11 shrink-0 rounded-xl bg-beige/50 bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${getProductImage(item.image, item.categoryId)}")`,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {item.name_he || item.name_en}
                    </span>
                    <span className="block truncate text-xs text-coffee/50">
                      {category?.name_he || category?.name_en || "—"}
                    </span>
                  </span>
                  <span className="rounded-full bg-beige/50 px-2 py-1 text-[11px]">
                    {t("admin.builder.groupCount").replace(
                      "{count}",
                      String(linkCounts.get(item.id) ?? 0)
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="min-w-0">
          {!product ? (
            <div className="rounded-[20px] border border-dashed border-beige-dark/30 bg-warm-white p-12 text-center text-sm text-coffee/50">
              {t("admin.builder.selectProductHint")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{product.name_he || product.name_en}</h2>
                  <p className="mt-1 text-sm text-coffee/50">
                    {t("admin.builder.linkedGroupsHeading")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                    <Eye className="h-4 w-4" /> {t("admin.builder.preview")}
                  </Button>
                  <Button onClick={openAddGroups}>
                    <Plus className="h-4 w-4" /> {t("admin.builder.addGroup")}
                  </Button>
                </div>
              </div>

              {dirty && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t("admin.builder.unsavedAssignments")}
                </p>
              )}

              {draftLinks.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-beige-dark/30 bg-warm-white p-10 text-center">
                  <p className="font-semibold">{t("admin.builder.noLinkedGroups")}</p>
                  <Button className="mt-4" onClick={openAddGroups}>
                    <Plus className="h-4 w-4" /> {t("admin.builder.addGroup")}
                  </Button>
                </div>
              ) : (
                <SortableList
                  items={draftLinks}
                  onReorder={(items) =>
                    updateDraft(() =>
                      items.map((link, index) => ({ ...link, sortOrder: index + 1 }))
                    )
                  }
                  className="space-y-3"
                  renderItem={(link, dragHandle) => {
                    const group = groupById.get(link.groupId);
                    if (!group) return null;
                    return (
                      <div className="flex items-center gap-3 rounded-[18px] border border-beige-dark/15 bg-warm-white p-4 shadow-soft">
                        {dragHandle}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{group.name_he || group.name_en}</p>
                          <p className="mt-1 text-xs text-coffee/50">
                            {t(
                              SELECTION_TYPE_KEYS[
                                (link.selectionType ?? group.selectionType) as keyof typeof SELECTION_TYPE_KEYS
                              ]
                            )}
                            {" · "}
                            {(link.requirement ?? group.requirement) === "required"
                              ? t("admin.modifiers.required")
                              : t("admin.modifiers.optional")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditLink(link);
                            setEditRequirement(link.requirement ?? "");
                          }}
                        >
                          <Pencil className="h-4 w-4" /> {t("admin.action.edit")}
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setRemoveLink(link)}>
                          <Unlink className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    );
                  }}
                />
              )}
            </div>
          )}
        </section>
      </div>

      <AdminModal
        open={linkOpen}
        onOpenChange={(open) => {
          setLinkOpen(open);
          if (!open) resetCreateForm();
        }}
        size="sm"
      >
        <AdminModalHeader onClose={() => { setLinkOpen(false); resetCreateForm(); }}>
          <AdminModalTitle>
            {createMode
              ? t("admin.builder.createNewGroup")
              : t("admin.builder.addModifierGroup")}
          </AdminModalTitle>
        </AdminModalHeader>
        <AdminModalBody>
            {createMode ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="builder-new-group-name">
                    {t("admin.modifiers.nameHeRequired")}
                  </Label>
                  <Input
                    id="builder-new-group-name"
                    dir="rtl"
                    autoFocus
                    value={newGroupName}
                    onChange={(event) => setNewGroupName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void createAndAssignGroup();
                      }
                    }}
                    className="mt-1 h-11 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["single", "multiple"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewGroupSelection(type)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                        newGroupSelection === type
                          ? "border-turquoise bg-turquoise/10 text-turquoise"
                          : "border-beige-dark/20 text-coffee/70 hover:bg-beige/30"
                      )}
                    >
                      {t(
                        type === "single"
                          ? "admin.modifiers.selectionSingle"
                          : "admin.modifiers.selectionMultiple"
                      )}
                    </button>
                  ))}
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-beige-dark/15 px-3">
                  <input
                    type="checkbox"
                    checked={newGroupRequired}
                    onChange={(event) => setNewGroupRequired(event.target.checked)}
                  />
                  <span className="text-sm">{t("admin.modifiers.required")}</span>
                </label>
                {createError && (
                  <p className="text-sm text-red-600">{createError}</p>
                )}
                <p className="text-xs text-coffee/45">
                  {t("admin.builder.createGroupHint")}{" "}
                  <Link
                    href={adminPath("modifier-groups")}
                    className="font-semibold text-turquoise underline"
                  >
                    {t("admin.builder.goToModifierManagement")}
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40" />
                  <Input
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                    placeholder={t("admin.builder.searchGroups")}
                    className="h-11 ps-10"
                  />
                </div>
                <div className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto">
                  {availableGroups.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-beige-dark/25 px-3 py-6 text-center text-sm text-coffee/50">
                      {t("admin.builder.noGroupsToAdd")}
                    </p>
                  ) : (
                    availableGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-beige-dark/15 px-3"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.has(group.id)}
                          onChange={(event) => {
                            const next = new Set(selectedGroupIds);
                            if (event.target.checked) next.add(group.id);
                            else next.delete(group.id);
                            setSelectedGroupIds(next);
                          }}
                        />
                        <span>{group.name_he || group.name_en}</span>
                      </label>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode(true);
                    setCreateError(null);
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-turquoise/40 px-3 py-3 text-sm font-semibold text-turquoise transition-colors hover:bg-turquoise/5"
                >
                  <Plus className="h-4 w-4" />
                  {t("admin.builder.createNewGroup")}
                </button>
              </>
            )}
        </AdminModalBody>
        <AdminModalFooter className="justify-between">
          {createMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateMode(false);
                  setCreateError(null);
                }}
                disabled={creating}
              >
                <ArrowRight className="h-4 w-4" />
                {t("admin.builder.backToList")}
              </Button>
              <Button
                type="button"
                disabled={creating || !newGroupName.trim()}
                onClick={() => void createAndAssignGroup()}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("admin.builder.createAndAssign")
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinkOpen(false)}
              >
                {t("admin.action.cancel")}
              </Button>
              <Button
                type="button"
                disabled={selectedGroupIds.size === 0}
                onClick={addSelectedGroups}
              >
                {t("admin.builder.addSelectedGroups")}
              </Button>
            </>
          )}
        </AdminModalFooter>
      </AdminModal>

      <AdminModal open={Boolean(removeLink)} onOpenChange={(open) => !open && setRemoveLink(null)} size="sm">
        <AdminModalHeader onClose={() => setRemoveLink(null)}><AdminModalTitle>{t("admin.builder.removeAssignment")}</AdminModalTitle></AdminModalHeader>
        <AdminModalBody>
          <p>
            {t("admin.builder.removeAssignmentQuestion")
              .replace("{group}", groupById.get(removeLink?.groupId ?? "")?.name_he || "")
              .replace("{product}", product?.name_he || "")}
          </p>
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="outline" onClick={() => setRemoveLink(null)}>{t("admin.action.cancel")}</Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (removeLink) {
                updateDraft((current) => current.filter((link) => link.id !== removeLink.id));
              }
              setRemoveLink(null);
            }}
          >
            {t("admin.builder.removeLinkOnly")}
          </Button>
        </AdminModalFooter>
      </AdminModal>

      <AdminModal open={Boolean(editLink)} onOpenChange={(open) => !open && setEditLink(null)} size="sm">
        <AdminModalHeader onClose={() => setEditLink(null)}><AdminModalTitle>{t("admin.builder.editAssignment")}</AdminModalTitle></AdminModalHeader>
        <AdminModalBody>
          <label className="text-sm font-medium">{t("admin.builder.requirementForProduct")}</label>
          <select
            value={editRequirement}
            onChange={(event) => setEditRequirement(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-beige-dark/25 bg-warm-white px-3"
          >
            <option value="">{t("admin.builder.useGroupDefault")}</option>
            <option value="required">{t("admin.modifiers.required")}</option>
            <option value="optional">{t("admin.modifiers.optional")}</option>
          </select>
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="outline" onClick={() => setEditLink(null)}>{t("admin.action.cancel")}</Button>
          <Button
            onClick={() => {
              if (editLink) {
                updateDraft((current) =>
                  current.map((link) =>
                    link.id === editLink.id
                      ? {
                          ...link,
                          requirement:
                            (editRequirement || undefined) as ProductModifierGroup["requirement"],
                        }
                      : link
                  )
                );
              }
              setEditLink(null);
            }}
          >
            {t("admin.action.save")}
          </Button>
        </AdminModalFooter>
      </AdminModal>

      <AdminModal open={previewOpen} onOpenChange={setPreviewOpen} size="md">
        <AdminModalHeader onClose={() => setPreviewOpen(false)}><AdminModalTitle>{t("admin.builder.customerPreview")}</AdminModalTitle></AdminModalHeader>
        <AdminModalBody>
          {product && config ? (
            <ProductBuilderPreview product={product} config={config} />
          ) : (
            <div className="grid min-h-48 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-turquoise" />
            </div>
          )}
        </AdminModalBody>
      </AdminModal>

      <AdminToastStack
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((current) => current.filter((toast) => toast.id !== id))
        }
      />
    </div>
  );
}
