"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Phone, MessageCircle, Trash2, ShoppingBag, MapPin } from "lucide-react";
import { useAssistant, useAssistantCart } from "@/features/assistant/assistant-context";
import {
  AssistantAvatar,
  AssistantCartPanel,
  AssistantProductCard,
  AssistantProductDetail,
  AssistantTypingIndicator,
} from "@/features/assistant/assistant-parts";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { resolveAssistantIcon } from "@/lib/icons/assistant-icons";

export function AssistantDrawer() {
  const t = useT();
  const router = useRouter();
  const { dir, locale } = useLocale();
  const { itemCount } = useAssistantCart();
  const {
    isOpen,
    close,
    messages,
    isLoading,
    config,
    settings,
    cartOpen,
    setCartOpen,
    selectedProduct,
    setSelectedProduct,
    suggestions,
    sendMessage,
    sendQuickAction,
    viewProduct,
    addProductToCart,
    clearHistory,
  } = useAssistant();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions = config.quickActions
    .filter((a) => a.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const phone = settings?.phone ?? "";
  const whatsapp = settings?.social?.whatsapp ?? settings?.phone ?? "";
  const mapsUrl = settings?.mapsUrl ?? "";

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [isOpen, messages, isLoading, cartOpen, selectedProduct]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (selectedProduct) {
          setSelectedProduct(null);
        } else {
          close();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close, selectedProduct, setSelectedProduct]);

  const greeting = config.greeting[locale];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    void sendMessage(text);
  };

  const showSuggestions = suggestions.length > 0 && !isLoading && !selectedProduct;

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
            id="assistant-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assistant-drawer-title"
            dir={dir}
            className={cn(
              "fixed z-[71] flex flex-col glass shadow-premium overflow-hidden",
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

            <div className="flex items-center justify-between gap-3 border-b border-beige-dark/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <AssistantAvatar size="md" />
                <div>
                  <h2 id="assistant-drawer-title" className="font-display text-base font-bold text-dark-brown">
                    {t("assistant.title")}
                  </h2>
                  <p className="text-xs text-coffee/50">{t("assistant.subtitle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCartOpen(!cartOpen)}
                  aria-label={t("assistant.viewCart")}
                  aria-pressed={cartOpen}
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                    cartOpen ? "bg-turquoise/15 text-turquoise" : "text-coffee/50 hover:bg-beige/60"
                  )}
                >
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-turquoise px-1 text-[10px] font-bold text-warm-white">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={clearHistory}
                  aria-label={t("assistant.clearChat")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-coffee/50 hover:bg-beige/60"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t("common.close")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-coffee/60 hover:bg-beige/60"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto px-4 py-2.5 hide-scrollbar">
              {quickActions.map((action) => {
                const Icon = resolveAssistantIcon(action);
                const label = action.label[locale];
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void sendQuickAction(action.id, label)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-beige-dark/25 bg-warm-white/70 px-3 py-1.5 text-xs font-medium text-coffee transition-colors hover:bg-beige/60 disabled:opacity-50"
                  >
                    <Icon className="h-3.5 w-3.5 text-turquoise" strokeWidth={1.75} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <div className="flex gap-3">
                  <AssistantAvatar size="sm" />
                  <div className="max-w-[85%] rounded-2xl rounded-ss-md bg-beige/50 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-dark-brown">
                    {greeting}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                  {msg.role === "assistant" && <AssistantAvatar size="sm" />}
                  <div className={cn("max-w-[85%] space-y-2", msg.role === "user" && "items-end")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                        msg.role === "user"
                          ? "rounded-se-md bg-turquoise text-warm-white"
                          : "rounded-ss-md bg-beige/50 text-dark-brown"
                      )}
                    >
                      {msg.content}
                    </div>
                    {msg.products && msg.products.length > 0 && (
                      <div className="grid gap-2">
                        {msg.products.map((p) => (
                          <AssistantProductCard
                            key={p.id}
                            product={p}
                            onSelect={() => void viewProduct(p)}
                            onAdd={() => addProductToCart(p.id)}
                          />
                        ))}
                      </div>
                    )}
                    {msg.showContact && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {phone && (
                          <a
                            href={`tel:${phone.replace(/\s/g, "")}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-beige/70 px-3 py-2 text-xs font-semibold text-coffee"
                          >
                            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {t("assistant.callUs")}
                          </a>
                        )}
                        {whatsapp && (
                          <a
                            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-beige-dark/30 bg-warm-white px-3 py-2 text-xs font-semibold text-coffee"
                          >
                            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {t("common.whatsapp")}
                          </a>
                        )}
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-beige-dark/30 bg-warm-white px-3 py-2 text-xs font-semibold text-coffee"
                          >
                            <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {t("assistant.openMaps")}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <AnimatePresence mode="wait">
                {selectedProduct && (
                  <AssistantProductDetail
                    key={selectedProduct.id}
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onAdd={(qty) => {
                      addProductToCart(selectedProduct.id, qty);
                      setSelectedProduct(null);
                    }}
                  />
                )}
              </AnimatePresence>

              {(cartOpen || messages.some((m) => m.showCart)) && (
                <div className="rounded-2xl border border-beige-dark/20 bg-beige/20 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-coffee/50">
                    {t("cart.title")}
                  </p>
                  <AssistantCartPanel onCheckout={() => router.push("/checkout")} />
                </div>
              )}

              {isLoading && (
                <div className="flex gap-3">
                  <AssistantAvatar size="sm" />
                  <AssistantTypingIndicator />
                </div>
              )}
            </div>

            {showSuggestions && (
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

            <form
              onSubmit={handleSubmit}
              className="border-t border-beige-dark/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-beige-dark/25 bg-warm-white/80 p-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("assistant.inputPlaceholder")}
                  aria-label={t("assistant.inputPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-coffee/40"
                  maxLength={500}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label={t("assistant.send")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-turquoise text-warm-white disabled:opacity-40"
                >
                  <Send className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-coffee/35">
                {BRAND.name} · {t("assistant.footer")}
              </p>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
