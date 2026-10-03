"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { AssistantAvatar } from "@/features/assistant/assistant-parts";
import { resolveAssistantIcon } from "@/lib/icons/assistant-icons";
import { cn } from "@/lib/utils";
import type { AssistantConfig } from "@/lib/assistant/types";
import type { Locale } from "@/lib/i18n/types";

export function AssistantManagerPreview({ config }: { config: AssistantConfig }) {
  const [locale, setLocale] = useState<Locale>("he");
  const actions = [...config.quickActions]
    .filter((action) => action.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 5);

  return (
    <div className="overflow-hidden rounded-[24px] border border-beige-dark/20 bg-warm-white shadow-elevated">
      <div className="flex items-center justify-between border-b border-beige-dark/15 px-4 py-3">
        <div className="flex items-center gap-3">
          <AssistantAvatar size="md" />
          <div>
            <p className="font-display font-bold">CRISPY</p>
            <p className="text-xs text-coffee/50">העוזר החכם</p>
          </div>
        </div>
        <span className={cn("h-2.5 w-2.5 rounded-full", config.enabled ? "bg-emerald-500" : "bg-stone-400")} />
      </div>
      <div className="flex gap-1 border-b border-beige-dark/10 p-2">
        {(["he", "ar", "en"] as Locale[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            className={cn(
              "flex-1 rounded-lg px-2 py-1.5 text-xs",
              locale === value ? "bg-turquoise text-white" : "text-coffee/50"
            )}
          >
            {value === "he" ? "עברית" : value === "ar" ? "العربية" : "English"}
          </button>
        ))}
      </div>
      <div dir={locale === "en" ? "ltr" : "rtl"} className="h-[420px] space-y-4 overflow-y-auto bg-cream/40 p-4">
        <div className="max-w-[88%] whitespace-pre-line rounded-2xl rounded-se-sm bg-warm-white px-4 py-3 text-sm leading-relaxed shadow-sm">
          {config.greeting[locale]}
        </div>
        <div className="flex flex-wrap gap-2">
          {config.suggestedQuestions.slice(0, 6).map((question, index) => (
            <span key={`${question.he}-${index}`} className="rounded-full border border-turquoise/25 bg-warm-white px-3 py-2 text-xs text-coffee">
              {question[locale] || question.he}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = resolveAssistantIcon(action);
            return (
              <div key={action.id} className="flex items-center gap-2 rounded-xl border border-beige-dark/15 bg-warm-white px-3 py-2 text-sm">
                <Icon className="h-4 w-4 text-turquoise" />
                {action.label[locale] || action.label.he}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-beige-dark/15 p-3">
        <div className="flex-1 rounded-full bg-beige/30 px-4 py-2.5 text-sm text-coffee/40">כתבו הודעה...</div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-turquoise text-white">
          <Send className="h-4 w-4 rtl:rotate-180" />
        </span>
      </div>
    </div>
  );
}
