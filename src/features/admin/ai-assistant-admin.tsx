"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Plus, Trash2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  subscribeToAiAssistantConfig,
  updateAiAssistantConfig,
} from "@/services/aiAssistantService";
import { useAllProducts } from "@/hooks/useProducts";
import type { AiAssistantConfig, AiFaqItem, LocalizedText } from "@/lib/ai/types";
import { DEFAULT_AI_CONFIG } from "@/lib/ai/types";

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

export function AiAssistantAdmin() {
  const [config, setConfig] = useState<AiAssistantConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { products } = useAllProducts();

  useEffect(() => {
    return subscribeToAiAssistantConfig(setConfig, () => {});
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
    await updateAiAssistantConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addFaq = () => {
    const item: AiFaqItem = {
      id: `faq-${Date.now()}`,
      question: { he: "", ar: "", en: "" },
      answer: { he: "", ar: "", en: "" },
      keywords: [],
    };
    setConfig({ ...config, faq: [...config.faq, item] });
  };

  const addSuggested = () => {
    setConfig({
      ...config,
      suggestedQuestions: [...config.suggestedQuestions, { he: "", ar: "", en: "" }],
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-turquoise/15 text-turquoise">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-dark-brown">AI Assistant</h1>
            <p className="text-sm text-coffee/60">Manage MISHKAT AI ordering assistant</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft">
          <h2 className="text-sm font-semibold text-dark-brown">General</h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="h-4 w-4 rounded accent-turquoise"
            />
            <span className="text-sm">Enable AI Assistant</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.humanHandoffEnabled}
              onChange={(e) => setConfig({ ...config, humanHandoffEnabled: e.target.checked })}
              className="h-4 w-4 rounded accent-turquoise"
            />
            <span className="text-sm">Show human handoff (phone / WhatsApp)</span>
          </label>
          <LocaleFields
            label="Welcome Message"
            value={config.welcomeMessage}
            onChange={(welcomeMessage) => setConfig({ ...config, welcomeMessage })}
            multiline
          />
        </div>

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark-brown">Suggested Questions</h2>
            <Button variant="outline" size="sm" onClick={addSuggested}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          {config.suggestedQuestions.map((q, i) => (
            <div key={i} className="rounded-xl border border-beige-dark/20 p-3">
              <LocaleFields
                label={`Question ${i + 1}`}
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
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark-brown">Custom FAQ</h2>
            <Button variant="outline" size="sm" onClick={addFaq}>
              <Plus className="h-3.5 w-3.5" /> Add FAQ
            </Button>
          </div>
          {config.faq.length === 0 && (
            <p className="text-sm text-coffee/50">
              Hours, address, phone, parking, WiFi, delivery & pickup are answered automatically from Settings.
            </p>
          )}
          {config.faq.map((item, i) => (
            <div key={item.id} className="rounded-xl border border-beige-dark/20 p-4 space-y-3">
              <LocaleFields
                label="Question"
                value={item.question}
                onChange={(question) => {
                  const faq = [...config.faq];
                  faq[i] = { ...item, question };
                  setConfig({ ...config, faq });
                }}
              />
              <LocaleFields
                label="Answer"
                value={item.answer}
                onChange={(answer) => {
                  const faq = [...config.faq];
                  faq[i] = { ...item, answer };
                  setConfig({ ...config, faq });
                }}
                multiline
              />
              <div>
                <Label>Keywords (comma-separated)</Label>
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
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft lg:col-span-2">
          <h2 className="text-sm font-semibold text-dark-brown">Featured Products (Offers)</h2>
          <p className="text-xs text-coffee/50">Select products to highlight when customers ask about offers.</p>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-beige-dark/20 p-2">
            {products.slice(0, 50).map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-beige/30">
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
          <p className="text-xs text-coffee/60">
            Quick actions & cross-sell rules use defaults from{" "}
            <code className="rounded bg-warm-white px-1">DEFAULT_AI_CONFIG</code>. Menu data (products,
            categories, prices, availability) is loaded live from Firestore on every chat message.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setConfig({ ...DEFAULT_AI_CONFIG })}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
