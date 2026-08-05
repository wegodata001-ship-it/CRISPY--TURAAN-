"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SortableList } from "@/components/admin/sortable-list";
import { resolveAssistantIcon } from "@/lib/icons/assistant-icons";
import {
  subscribeToAssistantConfig,
  updateAssistantConfig,
} from "@/services/assistantService";
import { useAllProducts } from "@/hooks/useProducts";
import { useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import type {
  AssistantConfig,
  AssistantFaqItem,
  AssistantQuickAction,
  LocalizedText,
} from "@/lib/assistant/types";
import { DEFAULT_ASSISTANT_CONFIG } from "@/lib/assistant/types";

const LOCALES = ["he", "ar", "en"] as const;

function LocaleFields({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: LocalizedText;
  onChange: (v: LocalizedText) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {LOCALES.map((loc) =>
        multiline ? (
          <Textarea
            key={loc}
            placeholder={loc.toUpperCase()}
            value={value[loc]}
            onChange={(e) => onChange({ ...value, [loc]: e.target.value })}
            className="text-sm"
            rows={2}
          />
        ) : (
          <Input
            key={loc}
            placeholder={loc.toUpperCase()}
            value={value[loc]}
            onChange={(e) => onChange({ ...value, [loc]: e.target.value })}
            className="text-sm"
          />
        )
      )}
    </div>
  );
}

function reorderActions(actions: AssistantQuickAction[]): AssistantQuickAction[] {
  return actions.map((a, i) => ({ ...a, sortOrder: i }));
}

export function AssistantManagerAdmin() {
  const t = useT();
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { products } = useAllProducts();

  useEffect(() => {
    return subscribeToAssistantConfig(setConfig, () => {});
  }, []);

  if (!config) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-turquoise" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    await updateAssistantConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateAction = (id: string, patch: Partial<AssistantQuickAction>) => {
    setConfig({
      ...config,
      quickActions: config.quickActions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
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
    setConfig({ ...config, faq: [...config.faq, item] });
  };

  const addSuggested = () => {
    setConfig({
      ...config,
      suggestedQuestions: [...config.suggestedQuestions, { he: "", ar: "", en: "" }],
    });
  };

  const sortedActions = [...config.quickActions].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <AdminPageHeader
        title={t("admin.assistant.title")}
        subtitle={t("admin.assistant.subtitle")}
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? t("admin.action.saved") : t("admin.assistant.saveChanges")}
          </Button>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft">
          <h2 className="text-sm font-semibold text-dark-brown">{t("admin.assistant.general")}</h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-turquoise"
            />
            <span className="text-sm">{t("admin.assistant.enableAssistant")}</span>
          </label>
          <LocaleFields
            label={t("admin.assistant.greeting")}
            value={config.greeting}
            onChange={(greeting) => setConfig({ ...config, greeting })}
            multiline
          />
        </div>

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark-brown">{t("admin.assistant.suggestedQuestions")}</h2>
            <Button variant="outline" size="sm" onClick={addSuggested}>
              <Plus className="h-3.5 w-3.5" /> {t("admin.action.add")}
            </Button>
          </div>
          {config.suggestedQuestions.map((q, i) => (
            <div key={i} className="rounded-xl border border-beige-dark/20 p-3">
              <LocaleFields
                label={t("admin.assistant.questionNumber").replace("{n}", String(i + 1))}
                value={q}
                onChange={(v) => {
                  const next = [...config.suggestedQuestions];
                  next[i] = v;
                  setConfig({ ...config, suggestedQuestions: next });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-red-500"
                onClick={() =>
                  setConfig({
                    ...config,
                    suggestedQuestions: config.suggestedQuestions.filter((_, j) => j !== i),
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" /> {t("admin.assistant.remove")}
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft lg:col-span-2">
          <h2 className="text-sm font-semibold text-dark-brown">{t("admin.assistant.quickActions")}</h2>
          <p className="text-xs text-coffee/50">{t("admin.assistant.quickActionsHint")}</p>
          <SortableList
            items={sortedActions}
            onReorder={(items) =>
              setConfig({ ...config, quickActions: reorderActions(items) })
            }
            className="space-y-2"
            renderItem={(action, dragHandle) => {
              const Icon = resolveAssistantIcon(action);
              return (
                <div className="flex items-start gap-2 rounded-xl border border-beige-dark/20 bg-beige/10 p-3">
                  {dragHandle}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-turquoise/10 text-turquoise">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={action.enabled}
                          onChange={(e) => updateAction(action.id, { enabled: e.target.checked })}
                          className="h-4 w-4 rounded accent-turquoise"
                        />
                        {t("admin.assistant.visible")}
                      </label>
                      <span className="text-xs text-coffee/40">{action.action}</span>
                    </div>
                    <LocaleFields
                      label={t("admin.assistant.buttonLabel")}
                      value={action.label}
                      onChange={(label) => updateAction(action.id, { label })}
                    />
                  </div>
                </div>
              );
            }}
          />
        </div>

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark-brown">{t("admin.assistant.customFaq")}</h2>
            <Button variant="outline" size="sm" onClick={addFaq}>
              <Plus className="h-3.5 w-3.5" /> {t("admin.assistant.addFaq")}
            </Button>
          </div>
          <p className="text-sm text-coffee/50">{t("admin.assistant.faqAutoHint")}</p>
          {config.faq.map((item, i) => (
            <div key={item.id} className="space-y-3 rounded-xl border border-beige-dark/20 p-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => {
                    const faq = [...config.faq];
                    faq[i] = { ...item, enabled: e.target.checked };
                    setConfig({ ...config, faq });
                  }}
                  className="h-4 w-4 rounded accent-turquoise"
                />
                {t("admin.rules.enabled")}
              </label>
              <LocaleFields
                label={t("admin.assistant.question")}
                value={item.question}
                onChange={(question) => {
                  const faq = [...config.faq];
                  faq[i] = { ...item, question };
                  setConfig({ ...config, faq });
                }}
              />
              <LocaleFields
                label={t("admin.assistant.answer")}
                value={item.answer}
                onChange={(answer) => {
                  const faq = [...config.faq];
                  faq[i] = { ...item, answer };
                  setConfig({ ...config, faq });
                }}
                multiline
              />
              <div>
                <Label>{t("admin.assistant.keywords")}</Label>
                <Input
                  value={item.keywords.join(", ")}
                  onChange={(e) => {
                    const faq = [...config.faq];
                    faq[i] = {
                      ...item,
                      keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                    };
                    setConfig({ ...config, faq });
                  }}
                  className="mt-1"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500"
                onClick={() =>
                  setConfig({ ...config, faq: config.faq.filter((f) => f.id !== item.id) })
                }
              >
                <Trash2 className="h-3.5 w-3.5" /> {t("admin.assistant.remove")}
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft lg:col-span-2">
          <h2 className="text-sm font-semibold text-dark-brown">{t("admin.assistant.featuredProducts")}</h2>
          <p className="text-xs text-coffee/50">{t("admin.assistant.featuredProductsHint")}</p>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-beige-dark/20 p-2">
            {products.slice(0, 80).map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-beige/30"
              >
                <input
                  type="checkbox"
                  checked={config.featuredProductIds.includes(p.id)}
                  onChange={(e) => {
                    const ids = e.target.checked
                      ? [...config.featuredProductIds, p.id]
                      : config.featuredProductIds.filter((id) => id !== p.id);
                    setConfig({ ...config, featuredProductIds: ids });
                  }}
                  className="accent-turquoise"
                />
                <span className="text-sm">{p.name_he || p.name_en}</span>
                <span className="ms-auto text-xs text-coffee/40">₪{p.price}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-beige/30 p-4 lg:col-span-2">
          <p className="text-xs text-coffee/60">{t("admin.assistant.liveDataHint")}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setConfig({ ...DEFAULT_ASSISTANT_CONFIG })}
          >
            {t("admin.assistant.resetDefaults")}
          </Button>
        </div>
      </div>
    </div>
  );
}
