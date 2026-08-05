"use client";

import { useState, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Copy, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useModifierGroups, useModifierOptions } from "@/hooks/useModifiers";
import {
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  duplicateModifierGroup,
  reorderModifierGroups,
  createModifierOption,
  updateModifierOption,
  deleteModifierOption,
  reorderModifierOptions,
} from "@/services/modifierService";
import {
  modifierGroupSchema,
  modifierOptionSchema,
  type ModifierGroupInput,
  type ModifierOptionInput,
} from "@/lib/validation/modifier-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { SortableList } from "@/components/admin/sortable-list";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ModifierGroup, ModifierOption } from "@/types/modifiers";

function GroupOptionsPanel({ groupId }: { groupId: string }) {
  const { options, loading } = useModifierOptions(groupId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModifierOption | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<ModifierOptionInput>({
    resolver: zodResolver(modifierOptionSchema) as Resolver<ModifierOptionInput>,
    defaultValues: {
      groupId,
      nameHe: "",
      nameAr: "",
      nameEn: "",
      priceDelta: 0,
      cost: 0,
      sortOrder: options.length + 1,
      kitchenNote: "",
      active: true,
      archived: false,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      groupId,
      nameHe: "",
      nameAr: "",
      nameEn: "",
      priceDelta: 0,
      cost: 0,
      sortOrder: options.length + 1,
      kitchenNote: "",
      active: true,
      archived: false,
    });
    setOpen(true);
  };

  const openEdit = (opt: ModifierOption) => {
    setEditing(opt);
    form.reset({
      groupId,
      nameHe: opt.name_he,
      nameAr: opt.name_ar,
      nameEn: opt.name_en,
      priceDelta: opt.priceDelta,
      cost: opt.cost,
      sortOrder: opt.sortOrder,
      kitchenNote: opt.kitchenNote ?? "",
      color: opt.color,
      icon: opt.icon,
      imageUrl: opt.image ?? "",
      active: opt.active,
      archived: opt.archived,
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    const result = editing
      ? await updateModifierOption(editing.id, data)
      : await createModifierOption(data);
    setSaving(false);
    if (result.success) setOpen(false);
  });

  if (loading) return <p className="py-2 text-xs text-coffee/50">Loading options…</p>;

  return (
    <div className="mt-3 space-y-2 border-t border-beige-dark/20 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-coffee/45">Options</p>
        <Button type="button" size="sm" variant="outline" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add option
        </Button>
      </div>
      <SortableList
        items={options}
        onReorder={(items) => void reorderModifierOptions(items.map((o) => o.id))}
        renderItem={(opt, handle) => (
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-beige/30 px-2 py-1.5">
            {handle}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{opt.name_he || opt.name_en}</p>
              <p className="text-xs text-coffee/45">
                +₪{opt.priceDelta}
                {opt.kitchenNote ? ` · ${opt.kitchenNote}` : ""}
              </p>
            </div>
            <button type="button" onClick={() => openEdit(opt)} className="rounded p-1 hover:bg-beige/60">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void deleteModifierOption(opt.id)}
              className="rounded p-1 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit option" : "New option"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div><Label>Name (HE)</Label><Input {...form.register("nameHe")} className="mt-1" /></div>
            <div><Label>Name (AR)</Label><Input {...form.register("nameAr")} className="mt-1" /></div>
            <div><Label>Name (EN)</Label><Input {...form.register("nameEn")} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price +</Label><Input type="number" step="0.5" {...form.register("priceDelta", { valueAsNumber: true })} className="mt-1" /></div>
              <div><Label>Cost</Label><Input type="number" step="0.5" {...form.register("cost", { valueAsNumber: true })} className="mt-1" /></div>
            </div>
            <div><Label>Kitchen note</Label><Input {...form.register("kitchenNote")} className="mt-1" placeholder="e.g. light ice" /></div>
            <div><Label>Color</Label><Input {...form.register("color")} className="mt-1" placeholder="#hex" /></div>
            <div><Label>Icon</Label><Input {...form.register("icon")} className="mt-1" /></div>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ModifierGroupsAdmin() {
  const { groups, loading } = useModifierGroups();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModifierGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [ordered, setOrdered] = useState<ModifierGroup[]>([]);

  const displayList = ordered.length ? ordered : groups;

  const form = useForm<ModifierGroupInput>({
    resolver: zodResolver(modifierGroupSchema) as Resolver<ModifierGroupInput>,
    defaultValues: {
      nameHe: "",
      nameAr: "",
      nameEn: "",
      selectionType: "single",
      requirement: "optional",
      minSelections: 0,
      maxSelections: 1,
      displayType: "buttons",
      sortOrder: groups.length + 1,
      active: true,
      archived: false,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      nameHe: "",
      nameAr: "",
      nameEn: "",
      selectionType: "single",
      requirement: "optional",
      minSelections: 0,
      maxSelections: 1,
      displayType: "buttons",
      sortOrder: groups.length + 1,
      active: true,
      archived: false,
    });
    setOpen(true);
  };

  const openEdit = (group: ModifierGroup) => {
    setEditing(group);
    form.reset({
      nameHe: group.name_he,
      nameAr: group.name_ar,
      nameEn: group.name_en,
      selectionType: group.selectionType,
      requirement: group.requirement,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      displayType: group.displayType,
      sortOrder: group.sortOrder,
      color: group.color,
      icon: group.icon,
      active: group.active,
      archived: group.archived,
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    const result = editing
      ? await updateModifierGroup(editing.id, data)
      : await createModifierGroup(data);
    setSaving(false);
    if (result.success) setOpen(false);
  });

  const handleReorder = async (items: ModifierGroup[]) => {
    setOrdered(items);
    await reorderModifierGroups(items.map((g) => g.id));
  };

  if (loading) return <p className="text-sm text-coffee/50">Loading modifier groups…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Modifier Groups</h1>
          <p className="text-sm text-coffee/55">Create reusable option groups — milk, ice, bread, sauces, etc.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New group</Button>
      </div>

      <SortableList
        items={displayList}
        onReorder={handleReorder}
        className="space-y-3"
        renderItem={(group, handle) => (
          <div className="rounded-2xl border border-beige-dark/25 bg-warm-white p-4 shadow-soft">
            <div className="flex items-start gap-2">
              {handle}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{group.name_he || group.name_en}</h3>
                  <Badge variant="outline">{group.selectionType}</Badge>
                  <Badge variant={group.requirement === "required" ? "default" : "outline"}>
                    {group.requirement}
                  </Badge>
                  <Badge variant="outline">{group.displayType}</Badge>
                </div>
                <p className="mt-1 text-xs text-coffee/45">
                  {group.name_en} · min {group.minSelections} · max {group.maxSelections}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => openEdit(group)} className="rounded-lg p-2 hover:bg-beige/50">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => void duplicateModifierGroup(group.id)} className="rounded-lg p-2 hover:bg-beige/50">
                  <Copy className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => void deleteModifierGroup(group.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === group.id ? null : group.id)}
                  className="rounded-lg p-2 hover:bg-beige/50"
                >
                  {expanded === group.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {expanded === group.id && <GroupOptionsPanel groupId={group.id} />}
          </div>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit group" : "New modifier group"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div><Label>Name (HE)</Label><Input {...form.register("nameHe")} className="mt-1" /></div>
            <div><Label>Name (AR)</Label><Input {...form.register("nameAr")} className="mt-1" /></div>
            <div><Label>Name (EN)</Label><Input {...form.register("nameEn")} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Selection type</Label>
                <select {...form.register("selectionType")} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option value="single">Single choice</option>
                  <option value="multiple">Multiple choice</option>
                  <option value="quantity">Quantity selector</option>
                  <option value="counter">Counter</option>
                </select>
              </div>
              <div>
                <Label>Required</Label>
                <select {...form.register("requirement")} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                  <option value="optional">Optional</option>
                  <option value="required">Required</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min selections</Label><Input type="number" {...form.register("minSelections", { valueAsNumber: true })} className="mt-1" /></div>
              <div><Label>Max selections</Label><Input type="number" {...form.register("maxSelections", { valueAsNumber: true })} className="mt-1" /></div>
            </div>
            <div>
              <Label>Display</Label>
              <select {...form.register("displayType")} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                <option value="buttons">Buttons</option>
                <option value="dropdown">Dropdown</option>
                <option value="chips">Chips</option>
                <option value="cards">Cards</option>
                <option value="icons">Icons</option>
                <option value="images">Images</option>
              </select>
            </div>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save group"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
