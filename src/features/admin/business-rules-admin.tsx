"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useBusinessRules } from "@/hooks/useModifiers";
import { useModifierGroups, useModifierOptions } from "@/hooks/useModifiers";
import {
  createBusinessRule,
  updateBusinessRule,
  deleteBusinessRule,
} from "@/services/modifierService";
import {
  businessRuleSchema,
  type BusinessRuleInput,
} from "@/lib/validation/modifier-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { BusinessRule } from "@/types/modifiers";

export function BusinessRulesAdmin() {
  const { rules, loading } = useBusinessRules();
  const { groups } = useModifierGroups();
  const { options } = useModifierOptions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessRule | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<BusinessRuleInput>({
    resolver: zodResolver(businessRuleSchema) as Resolver<BusinessRuleInput>,
    defaultValues: {
      name: "",
      enabled: true,
      priority: rules.length,
      conditions: [{ type: "option_selected", optionId: "" }],
      actions: [{ type: "hide_group", groupId: "" }],
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      enabled: true,
      priority: rules.length,
      conditions: [{ type: "option_selected", optionId: options[0]?.id ?? "" }],
      actions: [{ type: "hide_group", groupId: groups[0]?.id ?? "" }],
    });
    setOpen(true);
  };

  const openEdit = (rule: BusinessRule) => {
    setEditing(rule);
    form.reset({
      name: rule.name,
      enabled: rule.enabled,
      priority: rule.priority,
      conditions: rule.conditions,
      actions: rule.actions,
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    const result = editing
      ? await updateBusinessRule(editing.id, data)
      : await createBusinessRule(data);
    setSaving(false);
    if (result.success) setOpen(false);
  });

  const labelOption = (id?: string) => options.find((o) => o.id === id)?.name_he ?? id ?? "—";
  const labelGroup = (id?: string) => groups.find((g) => g.id === id)?.name_he ?? id ?? "—";

  if (loading) return <p className="text-sm text-coffee/50">Loading rules…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Business Rules</h1>
          <p className="text-sm text-coffee/55">
            Show/hide groups and options based on customer selections — no code changes needed.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New rule</Button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-2xl border border-beige-dark/25 bg-warm-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{rule.name}</h3>
                  <Badge variant={rule.enabled ? "default" : "outline"}>
                    {rule.enabled ? "Active" : "Disabled"}
                  </Badge>
                  <Badge variant="outline">Priority {rule.priority}</Badge>
                </div>
                <p className="mt-2 text-xs text-coffee/55">
                  IF{" "}
                  {rule.conditions.map((c, i) => (
                    <span key={i}>
                      {i > 0 ? " AND " : ""}
                      {c.type.replace(/_/g, " ")}
                      {c.optionId ? ` (${labelOption(c.optionId)})` : ""}
                      {c.groupId ? ` (${labelGroup(c.groupId)})` : ""}
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-xs text-coffee/55">
                  THEN{" "}
                  {rule.actions.map((a, i) => (
                    <span key={i}>
                      {i > 0 ? ", " : ""}
                      {a.type.replace(/_/g, " ")}
                      {a.groupId ? ` ${labelGroup(a.groupId)}` : ""}
                      {a.optionId ? ` ${labelOption(a.optionId)}` : ""}
                    </span>
                  ))}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => openEdit(rule)} className="rounded-lg p-2 hover:bg-beige/50">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => void deleteBusinessRule(rule.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-coffee/50">
            No rules yet. Example: hide &quot;Ice&quot; group when hot drink is selected.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit rule" : "New business rule"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>Rule name</Label><Input {...form.register("name")} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label><Input type="number" {...form.register("priority", { valueAsNumber: true })} className="mt-1" /></div>
              <div className="flex items-end gap-2 pb-2">
                <input type="checkbox" {...form.register("enabled")} id="enabled" />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
            </div>

            <div className="rounded-xl bg-beige/30 p-3">
              <Label>Condition</Label>
              <select {...form.register("conditions.0.type")} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                <option value="option_selected">Option selected</option>
                <option value="option_not_selected">Option not selected</option>
                <option value="group_has_selection">Group has selection</option>
              </select>
              <select {...form.register("conditions.0.optionId")} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm">
                <option value="">Select option (if applicable)</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>{o.name_he || o.name_en}</option>
                ))}
              </select>
              <select {...form.register("conditions.0.groupId")} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm">
                <option value="">Select group (if applicable)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name_he || g.name_en}</option>
                ))}
              </select>
            </div>

            <div className="rounded-xl bg-beige/30 p-3">
              <Label>Action</Label>
              <select {...form.register("actions.0.type")} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                <option value="hide_group">Hide group</option>
                <option value="hide_option">Hide option</option>
                <option value="show_group">Show group</option>
                <option value="show_option">Show option</option>
              </select>
              <select {...form.register("actions.0.groupId")} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm">
                <option value="">Target group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name_he || g.name_en}</option>
                ))}
              </select>
              <select {...form.register("actions.0.optionId")} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm">
                <option value="">Target option</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>{o.name_he || o.name_en}</option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save rule"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
