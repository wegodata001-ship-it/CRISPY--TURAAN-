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
import { useAllProducts } from "@/hooks/useProducts";

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

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const t = useT();
  const router = useRouter();
  const { items, addItem, removeItem } = useCart();
  const { products } = useAllProducts();

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
      if (!res.ok) throw new Error("Assistant request failed");
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
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: t("assistant.error"),
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, fetchAssistant, locale, cartProductIds, cartItems, appendReply, t]
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
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: t("assistant.error"),
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAssistant, locale, cartProductIds, cartItems, appendReply, t]
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
