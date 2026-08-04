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
  DEFAULT_AI_CONFIG,
  type AiAssistantConfig,
  type AiChatResponse,
  type AiMenuProduct,
} from "@/lib/ai/types";
import { subscribeToAiAssistantConfig } from "@/services/aiAssistantService";
import { subscribeToSettings, type AppSettings } from "@/services/settingsService";
import { useCart } from "@/features/cart/cart-context";
import { useLocale } from "@/components/providers/locale-provider";
import { useAllProducts } from "@/hooks/useProducts";

const CHAT_STORAGE_KEY = "mishkat-ai-chat";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: AiMenuProduct[];
  showHandoff?: boolean;
  timestamp: number;
}

type AiAssistantContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: ChatMessage[];
  isTyping: boolean;
  config: AiAssistantConfig;
  settings: AppSettings | null;
  enabled: boolean;
  sendMessage: (text: string) => Promise<void>;
  sendQuickAction: (actionId: string) => Promise<void>;
  addProductToCart: (productId: string) => void;
  clearHistory: () => void;
};

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

function loadStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function persistMessages(messages: ChatMessage[]) {
  sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
}

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const router = useRouter();
  const { items, addItem, removeItem, openCart } = useCart();
  const { products } = useAllProducts();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [config, setConfig] = useState<AiAssistantConfig>(DEFAULT_AI_CONFIG);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lastAddedCategoryId, setLastAddedCategoryId] = useState<string | undefined>();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMessages(loadStoredMessages());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persistMessages(messages);
  }, [messages, hydrated]);

  useEffect(() => subscribeToAiAssistantConfig(setConfig, () => {}), []);
  useEffect(() => subscribeToSettings(setSettings, () => {}), []);

  const cartProductIds = useMemo(
    () => items.flatMap((i) => Array.from({ length: i.quantity }, () => i.product.id)),
    [items]
  );

  const applyClientAction = useCallback(
    (response: AiChatResponse) => {
      const action = response.clientAction;
      if (!action) return;
      switch (action.type) {
        case "add_to_cart": {
          const product = products.find((p) => p.id === action.productId);
          if (product?.available) {
            addItem(product);
            setLastAddedCategoryId(product.categoryId);
          }
          break;
        }
        case "remove_from_cart":
          removeItem(action.productId);
          break;
        case "show_cart":
          openCart();
          break;
        case "checkout":
          router.push("/checkout");
          break;
      }
    },
    [products, addItem, removeItem, openCart, router]
  );

  const fetchAi = useCallback(
    async (body: Record<string, unknown>): Promise<AiChatResponse> => {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("AI request failed");
      return res.json() as Promise<AiChatResponse>;
    },
    []
  );

  const appendAssistant = useCallback((response: AiChatResponse) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: response.message,
        products: response.products,
        showHandoff: response.showHandoff,
        timestamp: Date.now(),
      },
    ]);
    applyClientAction(response);
  }, [applyClientAction]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: trimmed, timestamp: Date.now() },
      ]);
      setIsTyping(true);

      try {
        const response = await fetchAi({
          message: trimmed,
          locale,
          cartProductIds,
          lastAddedCategoryId,
        });
        appendAssistant(response);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content:
              locale === "he"
                ? "משהו השתבש. נסו שוב או פנו לצוות."
                : locale === "ar"
                  ? "حدث خطأ. حاول مرة أخرى أو تواصل مع الفريق."
                  : "Something went wrong. Please try again or contact our team.",
            showHandoff: true,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, fetchAi, locale, cartProductIds, lastAddedCategoryId, appendAssistant]
  );

  const sendQuickAction = useCallback(
    async (actionId: string) => {
      setIsTyping(true);
      try {
        const response = await fetchAi({
          message: "",
          locale,
          cartProductIds,
          quickActionId: actionId,
        });
        appendAssistant(response);
      } finally {
        setIsTyping(false);
      }
    },
    [fetchAi, locale, cartProductIds, appendAssistant]
  );

  const addProductToCart = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (product?.available) {
        addItem(product);
        setLastAddedCategoryId(product.categoryId);
      }
    },
    [products, addItem]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((p) => !p),
      messages,
      isTyping,
      config,
      settings,
      enabled: config.enabled,
      sendMessage,
      sendQuickAction,
      addProductToCart,
      clearHistory,
    }),
    [
      isOpen,
      messages,
      isTyping,
      config,
      settings,
      sendMessage,
      sendQuickAction,
      addProductToCart,
      clearHistory,
    ]
  );

  return (
    <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>
  );
}

export function useAiAssistant() {
  const ctx = useContext(AiAssistantContext);
  if (!ctx) throw new Error("useAiAssistant must be used within AiAssistantProvider");
  return ctx;
}
