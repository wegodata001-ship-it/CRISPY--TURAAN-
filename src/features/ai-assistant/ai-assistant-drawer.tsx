"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Phone, MessageCircle, Trash2 } from "lucide-react";
import { useAiAssistant } from "@/features/ai-assistant/ai-assistant-context";
import {
  AiAvatar,
  AiProductCard,
  AiTypingIndicator,
} from "@/features/ai-assistant/ai-assistant-parts";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export function AiAssistantDrawer() {
  const t = useT();
  const { dir, locale } = useLocale();
  const {
    isOpen,
    close,
    messages,
    isTyping,
    config,
    settings,
    sendMessage,
    sendQuickAction,
    addProductToCart,
    clearHistory,
  } = useAiAssistant();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [isOpen, messages, isTyping]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const welcome = config.welcomeMessage[locale];
  const suggestions = config.suggestedQuestions.map((q) => q[locale]);
  const phone = settings?.phone ?? "";
  const whatsapp = settings?.social?.whatsapp ?? phone;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    void sendMessage(text);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-dark-brown/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-drawer-title"
            dir={dir}
            className={cn(
              "ai-drawer fixed z-[71] flex flex-col glass shadow-premium overflow-hidden",
              "border border-white/40 dark:border-white/10",
              "inset-x-0 bottom-0 max-h-[min(92vh,720px)] rounded-t-3xl",
              "md:inset-y-0 md:end-0 md:start-auto md:w-[min(100vw-2rem,420px)] md:max-h-none md:rounded-s-3xl md:rounded-te-none"
            )}
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="mx-auto mt-3 h-1 w-12 shrink-0 rounded-full bg-beige-dark/50 md:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-beige-dark/20 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-3">
                <AiAvatar size="md" />
                <div>
                  <h2 id="ai-drawer-title" className="font-display text-base font-bold text-dark-brown dark:text-warm-white">
                    MISHKAT AI
                  </h2>
                  <p className="text-xs text-coffee/50 dark:text-warm-white/50">
                    {t("ai.subtitle")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={clearHistory}
                  aria-label={t("ai.clearChat")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-coffee/50 hover:bg-beige/60 dark:hover:bg-white/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t("common.close")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-coffee/60 hover:bg-beige/60 dark:hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 overflow-x-auto px-4 py-2.5 hide-scrollbar">
              {config.quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => void sendQuickAction(action.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-beige-dark/25 bg-warm-white/70 px-3 py-1.5 text-xs font-medium text-coffee transition-colors hover:bg-beige/60 dark:border-white/10 dark:bg-white/5 dark:text-warm-white"
                >
                  <span aria-hidden>{action.emoji}</span>
                  {action.label[locale]}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <div className="flex gap-3">
                  <AiAvatar size="sm" />
                  <div className="max-w-[85%] rounded-2xl rounded-ss-md bg-beige/50 px-4 py-3 text-sm leading-relaxed text-dark-brown dark:bg-white/10 dark:text-warm-white">
                    {welcome}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                  {msg.role === "assistant" && <AiAvatar size="sm" />}
                  <div className={cn("max-w-[85%] space-y-2", msg.role === "user" && "items-end")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                        msg.role === "user"
                          ? "rounded-se-md bg-turquoise text-warm-white"
                          : "rounded-ss-md bg-beige/50 text-dark-brown dark:bg-white/10 dark:text-warm-white"
                      )}
                    >
                      {msg.content}
                    </div>
                    {msg.products && msg.products.length > 0 && (
                      <div className="grid gap-2">
                        {msg.products.map((p) => (
                          <AiProductCard
                            key={p.id}
                            product={p}
                            onAdd={() => addProductToCart(p.id)}
                          />
                        ))}
                      </div>
                    )}
                    {msg.showHandoff && config.humanHandoffEnabled && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {phone && (
                          <a
                            href={`tel:${phone.replace(/\s/g, "")}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-beige/70 px-3 py-2 text-xs font-semibold text-coffee hover:bg-beige dark:bg-white/10 dark:text-warm-white"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {t("ai.callUs")}
                          </a>
                        )}
                        {whatsapp && (
                          <a
                            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366]/15 px-3 py-2 text-xs font-semibold text-[#128C7E] hover:bg-[#25D366]/25"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <AiAvatar size="sm" />
                  <AiTypingIndicator />
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length === 0 && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="rounded-full border border-turquoise/30 bg-turquoise/10 px-3 py-1.5 text-xs font-medium text-turquoise hover:bg-turquoise/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-beige-dark/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/10"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-beige-dark/25 bg-warm-white/80 p-1.5 dark:border-white/10 dark:bg-white/5">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("ai.inputPlaceholder")}
                  aria-label={t("ai.inputPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-coffee/40 dark:text-warm-white"
                  maxLength={500}
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  aria-label={t("ai.send")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-turquoise text-warm-white transition-opacity disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-coffee/35 dark:text-warm-white/30">
                {BRAND.name} · {t("ai.poweredBy")}
              </p>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
