"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_ASSISTANT_CONFIG,
  type AssistantConfig,
  type AssistantChatResponse,
  type AssistantProduct,
} from "@/lib/assistant/types";
import { subscribeToAssistantConfig } from "@/services/assistantService";
import { subscribeToSettings, type AppSettings } from "@/services/settingsService";
import { useCart } from "@/features/cart/cart-context";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { useAllProducts, useAllCategories } from "@/hooks/useProducts";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import type { Locale } from "@/lib/i18n/types";

const STORAGE_KEY = "mishkat-assistant-chat";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: AssistantProduct[];
  showContact?: boolean;
  showCart?: boolean;
  timestamp: number;
}

type AssistantContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: AssistantMessage[];
  isLoading: boolean;
  config: AssistantConfig;
  settings: AppSettings | null;
  enabled: boolean;
  cartOpen: boolean;
  selectedProduct: AssistantProduct | null;
  suggestions: string[];
  sendMessage: (text: string) => Promise<void>;
  sendQuickAction: (actionId: string, label: string) => Promise<void>;
  viewProduct: (product: AssistantProduct) => Promise<void>;
  addProductToCart: (productId: string, quantity?: number) => void;
  clearHistory: () => void;
  setCartOpen: (open: boolean) => void;
  setSelectedProduct: (product: AssistantProduct | null) => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

function loadMessages(): AssistantMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AssistantMessage[]) : [];
  } catch {
    return [];
  }
}

function clientFallback(
  actionId: string | undefined,
  message: string,
  locale: Locale,
  products: import("@/types").Product[],
  categories: import("@/types").Category[],
  config: AssistantConfig,
  settings: AppSettings | null
): AssistantChatResponse {
  const loc = locale;
  const respond = (msg: string, prods: AssistantProduct[] = [], extra?: Partial<AssistantChatResponse>): AssistantChatResponse => ({
    message: msg,
    products: prods,
    suggestions: [],
    ...extra,
  });

  const toAssistantProduct = (p: import("@/types").Product): AssistantProduct => ({
    id: p.id,
    name: getLocalizedName(p, loc),
    description: "",
    price: p.price,
    image: p.image,
    categoryId: p.categoryId,
    available: p.available,
    isPopular: p.isPopular,
    isNew: p.isNew,
  });

  const available = products.filter((p) => p.available && p.active !== false);

  if (actionId) {
    const action = config.quickActions.find((a) => a.id === actionId);
    if (action) {
      switch (action.action) {
        case "category": {
          const catProducts = available.filter((p) => p.categoryId === action.categoryId).slice(0, 8);
          const cat = categories.find((c) => c.id === action.categoryId);
          const catName = cat ? getLocalizedName(cat, loc) : action.label[loc];
          return respond(catName, catProducts.map(toAssistantProduct));
        }
        case "categories": {
          const catProducts = available.filter((p) => action.categoryIds?.includes(p.categoryId)).slice(0, 8);
          return respond(action.label[loc], catProducts.map(toAssistantProduct));
        }
        case "popular": {
          const pop = available.filter((p) => p.isPopular).slice(0, 8);
          return respond(action.label[loc], pop.map(toAssistantProduct));
        }
        case "cart":
          return respond(loc === "ar" ? "سلتك" : loc === "he" ? "העגלה שלך" : "Your cart", [], { showCart: true });
        case "checkout":
          return respond(loc === "ar" ? "انتقل إلى الدفع" : loc === "he" ? "מעבר לתשלום" : "Go to checkout", [], { clientAction: { type: "checkout" } });
        case "contact": {
          const phone = settings?.phone || config.links.phone || "";
          const address = settings?.address || "";
          const msg = loc === "ar"
            ? `تواصل معنا${phone ? `\n📞 ${phone}` : ""}${address ? `\n📍 ${address}` : ""}`
            : loc === "he"
              ? `צרו קשר${phone ? `\n📞 ${phone}` : ""}${address ? `\n📍 ${address}` : ""}`
              : `Contact us${phone ? `\n📞 ${phone}` : ""}${address ? `\n📍 ${address}` : ""}`;
          return respond(msg, [], { showContact: true });
        }
        default:
          return respond(action.label[loc]);
      }
    }
  }

  if (message) {
    const lower = message.toLowerCase();
    if (lower.includes("عنوان") || lower.includes("כתובת") || lower.includes("address") || lower.includes("موقع")) {
      const address = settings?.address || "";
      return respond(address || (loc === "ar" ? "لا يوجد عنوان محدد حالياً." : loc === "he" ? "אין כתובת מוגדרת כרגע." : "No address available."));
    }
    if (lower.includes("هاتف") || lower.includes("טלפון") || lower.includes("phone") || lower.includes("اتصل")) {
      const phone = settings?.phone || "";
      return respond(phone ? `📞 ${phone}` : (loc === "ar" ? "لا يوجد رقم هاتف." : "No phone number."));
    }
    if (lower.includes("ساعات") || lower.includes("שעות") || lower.includes("hours") || lower.includes("وقت")) {
      const hours = settings?.hours || "";
      return respond(hours || (loc === "ar" ? "لم يتم تحديد ساعات العمل." : "Hours not set."));
    }
    const matched = available.filter((p) => {
      const name = getLocalizedName(p, loc).toLowerCase();
      return name.includes(lower) || lower.includes(name);
    }).slice(0, 6);
    if (matched.length > 0) {
      return respond(loc === "ar" ? "نتائج البحث:" : loc === "he" ? "תוצאות:" : "Results:", matched.map(toAssistantProduct));
    }
  }

  return respond(
    loc === "ar" ? "لم أجد إجابة مناسبة. يمكنك اختيار أحد الخيارات أدناه أو التواصل معنا."
      : loc === "he" ? "לא מצאתי תשובה מתאימה. אפשר לבחור מהאפשרויות למטה או ליצור קשר."
      : "I couldn't find a matching answer. Please choose an option below or contact us."
  );
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const t = useT();
  const router = useRouter();
  const { items, addItem, removeItem } = useCart();
  const { products } = useAllProducts();
  const { categories } = useAllCategories();

  const [isOpen, setIsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AssistantProduct | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<AssistantConfig>(DEFAULT_ASSISTANT_CONFIG);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMessages(loadMessages());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  }, [messages, hydrated]);

  useEffect(() => subscribeToAssistantConfig(setConfig, () => {}), []);
  useEffect(() => subscribeToSettings(setSettings, () => {}), []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setSuggestions(config.suggestedQuestions.map((q) => q[locale]).slice(0, 6));
    }
  }, [isOpen, messages.length, config.suggestedQuestions, locale]);

  const cartProductIds = useMemo(
    () => items.flatMap((i) => Array.from({ length: i.quantity }, () => i.product.id)),
    [items]
  );

  const cartItems = useMemo(
    () => items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
    [items]
  );

  const applyAction = useCallback(
    (response: AssistantChatResponse) => {
      if (response.suggestions?.length) setSuggestions(response.suggestions);
      if (response.showCart) setCartOpen(true);
      const action = response.clientAction;
      if (!action) return;
      switch (action.type) {
        case "show_cart":
          setCartOpen(true);
          break;
        case "checkout":
          router.push("/checkout");
          break;
        case "open_url":
          if (action.url.startsWith("/")) {
            router.push(action.url);
          } else {
            try {
              const url = new URL(action.url);
              if (url.protocol === "https:" || url.protocol === "http:") {
                window.open(url.toString(), "_blank", "noopener,noreferrer");
              }
            } catch {
              // Ignore invalid admin-configured URLs.
            }
          }
          break;
        case "remove_from_cart": {
          const line = items.find((i) => i.product.id === action.productId);
          if (line) removeItem(line.lineId);
          break;
        }
      }
    },
    [removeItem, router, items]
  );

  const fetchAssistant = useCallback(
    async (body: Record<string, unknown>): Promise<AssistantChatResponse> => {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.message) {
          return { message: data.message, products: data.products || [], suggestions: data.suggestions || [] };
        }
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      return res.json() as Promise<AssistantChatResponse>;
    },
    []
  );

  const appendReply = useCallback(
    (response: AssistantChatResponse) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: response.message,
          products: response.products,
          showContact: response.showContact,
          showCart: response.showCart,
          timestamp: Date.now(),
        },
      ]);
      applyAction(response);
    },
    [applyAction]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setSelectedProduct(null);
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: trimmed, timestamp: Date.now() },
      ]);
      setIsLoading(true);

      try {
        const response = await fetchAssistant({
          message: trimmed,
          locale,
          cartProductIds,
          cartItems,
        });
        appendReply(response);
      } catch (err) {
        console.error("[CRISPY_ASSISTANT]", err);
        const fallback = clientFallback(undefined, trimmed, locale, products, categories, config, settings);
        appendReply(fallback);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, fetchAssistant, locale, cartProductIds, cartItems, appendReply, products, categories, config, settings]
  );

  const sendQuickAction = useCallback(
    async (actionId: string, label: string) => {
      setSelectedProduct(null);
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: label, timestamp: Date.now() },
      ]);
      setIsLoading(true);
      try {
        const response = await fetchAssistant({
          message: "",
          locale,
          cartProductIds,
          cartItems,
          quickActionId: actionId,
        });
        appendReply(response);
      } catch (err) {
        console.error("[CRISPY_ASSISTANT]", err);
        const fallback = clientFallback(actionId, "", locale, products, categories, config, settings);
        appendReply(fallback);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAssistant, locale, cartProductIds, cartItems, appendReply, products, categories, config, settings]
  );

  const viewProduct = useCallback(
    async (product: AssistantProduct) => {
      setSelectedProduct(product);
      setIsLoading(true);
      try {
        const response = await fetchAssistant({
          message: "",
          locale,
          cartProductIds,
          cartItems,
          productId: product.id,
        });
        appendReply(response);
      } catch {
        appendReply({
          message: product.name,
          products: [product],
          suggestions: [],
        });
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAssistant, locale, cartProductIds, cartItems, appendReply]
  );

  const addProductToCart = useCallback(
    (productId: string, quantity = 1) => {
      const product = products.find((p) => p.id === productId);
      if (!product?.available) return;
      for (let i = 0; i < quantity; i++) addItem(product);
      setCartOpen(true);
      const name =
        locale === "he"
          ? product.name_he || product.name_en
          : locale === "ar"
            ? product.name_ar || product.name_he
            : product.name_en || product.name_he;
      const addedMsg = t("assistant.addedToCart", `✓ ${name} added to cart`).replace("{name}", name);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: addedMsg,
          timestamp: Date.now(),
        },
      ]);
    },
    [products, addItem, locale, t]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setCartOpen(false);
    setSelectedProduct(null);
    setSuggestions(config.suggestedQuestions.map((q) => q[locale]).slice(0, 6));
    sessionStorage.removeItem(STORAGE_KEY);
  }, [config.suggestedQuestions, locale]);

  const value = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((p) => !p),
      messages,
      isLoading,
      config,
      settings,
      enabled: config.enabled,
      cartOpen,
      selectedProduct,
      suggestions,
      sendMessage,
      sendQuickAction,
      viewProduct,
      addProductToCart,
      clearHistory,
      setCartOpen,
      setSelectedProduct,
    }),
    [
      isOpen,
      messages,
      isLoading,
      config,
      settings,
      cartOpen,
      selectedProduct,
      suggestions,
      sendMessage,
      sendQuickAction,
      viewProduct,
      addProductToCart,
      clearHistory,
    ]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}

export function useAssistantCart() {
  return useCart();
}
