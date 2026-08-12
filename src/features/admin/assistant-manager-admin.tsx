"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Loader2, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SortableList } from "@/components/admin/sortable-list";
import {
  AdminDialog,
  AdminDialogBody,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogTitle,
} from "@/features/admin/components/admin-dialog";
import { AdminToastStack, createToast, type AdminToast } from "@/features/admin/components/admin-toast";
import { AssistantManagerPreview } from "@/features/admin/assistant-manager/assistant-preview";
import { LocalizedEditor } from "@/features/admin/assistant-manager/localized-editor";
import { SuggestedQuestionDialog } from "@/features/admin/assistant-manager/question-dialog";
import { QuickActionDialog } from "@/features/admin/assistant-manager/quick-action-dialog";
import { resolveAssistantIcon } from "@/lib/icons/assistant-icons";
import {
  subscribeToAssistantConfig,
  updateAssistantConfig,
} from "@/services/assistantService";
import { useAllCategories, useAllProducts } from "@/hooks/useProducts";
import { useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import type {
  AssistantConfig,
  AssistantFaqItem,
  AssistantQuickAction,
  LocalizedText,
} from "@/lib/assistant/types";
import { DEFAULT_ASSISTANT_CONFIG } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

function reorderActions(actions: AssistantQuickAction[]): AssistantQuickAction[] {
  return actions.map((action, index) => ({ ...action, sortOrder: index }));
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 items-center gap-3"
    >
      <span
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors",
          checked ? "bg-turquoise" : "bg-beige-dark/50"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "start-6" : "start-1"
          )}
        />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function Card({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-beige-dark/15 bg-warm-white p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-dark-brown dark:text-warm-white">{title}</h2>
          {description && <p className="mt-1 text-sm text-coffee/50">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function AssistantManagerAdmin() {
  const t = useT();
  const { products } = useAllProducts();
  const { categories } = useAllCategories();
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [questionEditor, setQuestionEditor] = useState<{ index: number; value: LocalizedText | null } | null>(null);
  const [actionEditor, setActionEditor] = useState<AssistantQuickAction | null | undefined>(undefined);
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const initialRef = useRef<AssistantConfig | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    return subscribeToAssistantConfig(
      (data) => {
        if (dirtyRef.current) return;
        setConfig(data);
        initialRef.current = structuredClone(data);
      },
      (message) => setSaveError(message)
    );
  }, []);

  const updateConfig = (updater: (current: AssistantConfig) => AssistantConfig) => {
    setConfig((current) => (current ? updater(current) : current));
    setDirty(true);
    dirtyRef.current = true;
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!config || saving || !dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await updateAssistantConfig(config);
      if (!result.success) {
        setSaveError(result.error);
        setToasts((current) => [...current, createToast(result.error, "error")]);
        return;
      }
      initialRef.current = structuredClone(config);
      setDirty(false);
      dirtyRef.current = false;
      setToasts((current) => [...current, createToast(t("admin.assistant.savedSuccess"))]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.assistant.saveError");
      setSaveError(message);
      setToasts((current) => [...current, createToast(message, "error")]);
    } finally {
      setSaving(false);
    }
  };

  const sortedActions = useMemo(
    () => (config ? [...config.quickActions].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [config]
  );

  if (!config) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-turquoise" />
      </div>
    );
  }

  const saveQuestion = (question: LocalizedText) => {
    updateConfig((current) => {
      const next = [...current.suggestedQuestions];
      const index = questionEditor?.index ?? -1;
      if (index >= 0) next[index] = question;
      else next.push(question);
      return { ...current, suggestedQuestions: next };
    });
  };

  const saveAction = (action: AssistantQuickAction) => {
    updateConfig((current) => {
      const exists = current.quickActions.some((item) => item.id === action.id);
      return {
        ...current,
        quickActions: exists
          ? current.quickActions.map((item) => (item.id === action.id ? action : item))
          : [...current.quickActions, action],
      };
    });
  };

  const addFaq = () => {
    const item: AssistantFaqItem = {
      id: `faq-${Date.now()}`,
      question: { he: "", ar: "", en: "" },
      answer: { he: "", ar: "", en: "" },
      keywords: [],
      enabled: true,
      sortOrder: config.faq.length,
    };
    updateConfig((current) => ({ ...current, faq: [...current.faq, item] }));
  };

  const updateFaq = (id: string, patch: Partial<AssistantFaqItem>) =>
    updateConfig((current) => ({
      ...current,
      faq: current.faq.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));

  return (
    <div className="mx-auto max-w-[1200px]">
      <AdminPageHeader
        title={t("admin.assistant.smartTitle")}
        subtitle={t("admin.assistant.smartSubtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-2 text-xs", dirty ? "text-amber-700" : "text-emerald-700")}>
              <span className={cn("h-2 w-2 rounded-full", dirty ? "bg-amber-500" : "bg-emerald-500")} />
              {dirty ? t("admin.assistant.unsaved") : t("admin.assistant.savedState")}
            </span>
            <Button variant="outline" onClick={() => setMobilePreview(true)}>
              <Eye className="h-4 w-4" /> {t("admin.assistant.preview")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t("admin.productForm.saving") : t("admin.assistant.saveChanges")}
            </Button>
          </div>
        }
      />

      {saveError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)]">
        <div className="space-y-5">
          <Card title={t("admin.assistant.general")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Switch
                checked={config.enabled}
                onChange={(enabled) => updateConfig((current) => ({ ...current, enabled }))}
                label={t("admin.assistant.enableAssistant")}
              />
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", config.enabled ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600")}>
                {config.enabled ? t("admin.assistant.activeOnSite") : t("admin.assistant.inactive")}
              </span>
            </div>
          </Card>

          <Card title={t("admin.assistant.welcomeMessage")}>
            <LocalizedEditor
              value={config.greeting}
              onChange={(greeting) => updateConfig((current) => ({ ...current, greeting }))}
              multiline
              rows={6}
              requiredHe
            />
          </Card>

          <Card
            title={t("admin.assistant.quickQuestions")}
            description={t("admin.assistant.quickQuestionsDescription")}
            actions={
              <Button variant="outline" size="sm" onClick={() => setQuestionEditor({ index: -1, value: null })}>
                <Plus className="h-4 w-4" /> {t("admin.assistant.addQuestion")}
              </Button>
            }
          >
            {config.suggestedQuestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-beige-dark/30 p-8 text-center">
                <p className="font-semibold">{t("admin.assistant.noQuestions")}</p>
                <p className="mt-1 text-sm text-coffee/50">{t("admin.assistant.noQuestionsHint")}</p>
              </div>
            ) : (
              <SortableList
                items={config.suggestedQuestions.map((question, index) => ({
                  id: `question-${index}`,
                  question,
                }))}
                onReorder={(items) =>
                  updateConfig((current) => ({
                    ...current,
                    suggestedQuestions: items.map((item) => item.question),
                  }))
                }
                className="space-y-2"
                renderItem={(item, dragHandle) => {
                  const index = Number(item.id.replace("question-", ""));
                  return (
                    <div className="flex items-center gap-3 rounded-2xl border border-beige-dark/15 p-4">
                      {dragHandle}
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold">{item.question.he || "—"}</p>
                        <p dir="rtl" className="truncate text-coffee/55">{item.question.ar || "—"}</p>
                        <p dir="ltr" className="truncate text-start text-coffee/55">{item.question.en || "—"}</p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => setQuestionEditor({ index, value: item.question })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          updateConfig((current) => ({
                            ...current,
                            suggestedQuestions: current.suggestedQuestions.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  );
                }}
              />
            )}
          </Card>

          <Card
            title={t("admin.assistant.quickActions")}
            description={t("admin.assistant.quickActionsDescription")}
            actions={
              <Button variant="outline" size="sm" onClick={() => setActionEditor(null)}>
                <Plus className="h-4 w-4" /> {t("admin.assistant.addAction")}
              </Button>
            }
          >
            {sortedActions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-beige-dark/30 p-8 text-center">
                <p className="font-semibold">{t("admin.assistant.noActions")}</p>
              </div>
            ) : (
              <SortableList
                items={sortedActions}
                onReorder={(items) =>
                  updateConfig((current) => ({ ...current, quickActions: reorderActions(items) }))
                }
                className="space-y-2"
                renderItem={(action, dragHandle) => {
                  const Icon = resolveAssistantIcon(action);
                  return (
                    <div className="flex items-center gap-3 rounded-2xl border border-beige-dark/15 p-3">
                      {dragHandle}
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-turquoise/10 text-turquoise">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold">{action.label.he}</p>
                        <p className="truncate text-coffee/50">{action.label.en} · {action.label.ar}</p>
                        <p className="mt-1 text-xs text-turquoise">{t(`admin.assistant.actionType.${action.action}`, t("admin.assistant.existingAction"))}</p>
                      </div>
                      <Switch
                        checked={action.enabled}
                        onChange={(enabled) =>
                          updateConfig((current) => ({
                            ...current,
                            quickActions: current.quickActions.map((item) =>
                              item.id === action.id ? { ...item, enabled } : item
                            ),
                          }))
                        }
                        label=""
                      />
                      <Button variant="ghost" size="icon-sm" onClick={() => setActionEditor(action)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          updateConfig((current) => ({
                            ...current,
                            quickActions: current.quickActions.filter((item) => item.id !== action.id),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  );
                }}
              />
            )}
          </Card>

          <Card
            title={t("admin.assistant.customFaq")}
            description={t("admin.assistant.faqAutoHint")}
            actions={<Button variant="outline" size="sm" onClick={addFaq}><Plus className="h-4 w-4" />{t("admin.assistant.addFaq")}</Button>}
          >
            <div className="space-y-2">
              {config.faq.map((item) => (
                <details key={item.id} className="rounded-2xl border border-beige-dark/15 p-4">
                  <summary className="cursor-pointer font-semibold">{item.question.he || t("admin.assistant.newFaq")}</summary>
                  <div className="mt-4 space-y-4">
                    <Switch checked={item.enabled} onChange={(enabled) => updateFaq(item.id, { enabled })} label={t("admin.rules.enabled")} />
                    <div><p className="mb-2 text-sm font-medium">{t("admin.assistant.question")}</p><LocalizedEditor value={item.question} onChange={(question) => updateFaq(item.id, { question })} /></div>
                    <div><p className="mb-2 text-sm font-medium">{t("admin.assistant.answer")}</p><LocalizedEditor value={item.answer} onChange={(answer) => updateFaq(item.id, { answer })} multiline /></div>
                    <div>
                      <p className="mb-1 text-sm font-medium">{t("admin.assistant.keywords")}</p>
                      <Input
                        value={item.keywords.join(", ")}
                        onChange={(event) => updateFaq(item.id, { keywords: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })}
                      />
                    </div>
                    <Button variant="ghost" className="text-red-600" onClick={() => updateConfig((current) => ({ ...current, faq: current.faq.filter((faq) => faq.id !== item.id) }))}>
                      <Trash2 className="h-4 w-4" /> {t("admin.assistant.remove")}
                    </Button>
                  </div>
                </details>
              ))}
            </div>
          </Card>

          <Card title={t("admin.assistant.featuredProducts")} description={t("admin.assistant.featuredProductsHint")}>
            <details>
              <summary className="cursor-pointer text-sm font-semibold">{t("admin.assistant.chooseFeaturedProducts")}</summary>
              <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-beige-dark/15 p-2">
                {products.slice(0, 100).map((product) => (
                  <label key={product.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-beige/30">
                    <input
                      type="checkbox"
                      checked={config.featuredProductIds.includes(product.id)}
                      onChange={(event) =>
                        updateConfig((current) => ({
                          ...current,
                          featuredProductIds: event.target.checked
                            ? [...current.featuredProductIds, product.id]
                            : current.featuredProductIds.filter((id) => id !== product.id),
                        }))
                      }
                    />
                    <span className="text-sm">{product.name_he || product.name_en}</span>
                    <span className="ms-auto text-xs text-coffee/50">₪{product.price}</span>
                  </label>
                ))}
              </div>
            </details>
          </Card>

          <div className="flex items-center justify-between rounded-2xl bg-beige/25 p-4">
            <p className="text-sm text-coffee/55">{t("admin.assistant.liveDataHint")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateConfig(() => structuredClone(DEFAULT_ASSISTANT_CONFIG))}
            >
              <RotateCcw className="h-4 w-4" /> {t("admin.assistant.resetDefaults")}
            </Button>
          </div>
        </div>

        <aside className="sticky top-24 hidden lg:block">
          <AssistantManagerPreview config={config} />
        </aside>
      </div>

      <SuggestedQuestionDialog
        open={questionEditor != null}
        initial={questionEditor?.value ?? null}
        onOpenChange={(open) => !open && setQuestionEditor(null)}
        onSave={saveQuestion}
      />
      <QuickActionDialog
        open={actionEditor !== undefined}
        initial={actionEditor ?? null}
        sortOrder={config.quickActions.length}
        categories={categories}
        products={products}
        onOpenChange={(open) => !open && setActionEditor(undefined)}
        onSave={saveAction}
      />
      <AdminDialog open={mobilePreview} onOpenChange={setMobilePreview}>
        <AdminDialogContent size="sm">
          <AdminDialogHeader><AdminDialogTitle>{t("admin.assistant.preview")}</AdminDialogTitle></AdminDialogHeader>
          <AdminDialogBody className="p-3"><AssistantManagerPreview config={config} /></AdminDialogBody>
        </AdminDialogContent>
      </AdminDialog>
      <AdminToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
