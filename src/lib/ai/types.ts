import type { Locale } from "@/lib/i18n/types";

export type LocalizedText = Record<Locale, string>;

export interface AiQuickAction {
  id: string;
  emoji: string;
  label: LocalizedText;
  /** Category filter or intent keyword */
  action: "category" | "popular" | "offers" | "cart";
  categoryId?: string;
}

export interface AiFaqItem {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
  /** Keywords for matching (all locales) */
  keywords: string[];
}

export interface AiCrossSellRule {
  triggerCategoryId: string;
  suggestCategoryIds: string[];
}

export interface AiAssistantConfig {
  enabled: boolean;
  welcomeMessage: LocalizedText;
  suggestedQuestions: LocalizedText[];
  quickActions: AiQuickAction[];
  faq: AiFaqItem[];
  crossSellRules: AiCrossSellRule[];
  featuredProductIds: string[];
  humanHandoffEnabled: boolean;
}

export const DEFAULT_AI_CONFIG: AiAssistantConfig = {
  enabled: true,
  welcomeMessage: {
    he: "שלום! אני MISHKAT AI — העוזר החכם שלכם. איך אוכל לעזור להזמנה שלכם היום?",
    ar: "مرحباً! أنا MISHKAT AI — مساعدكم الذكي. كيف يمكنني مساعدتكم في طلبكم اليوم؟",
    en: "Hello! I'm MISHKAT AI — your smart ordering assistant. How can I help with your order today?",
  },
  suggestedQuestions: [
    {
      he: "אני רוצה קפה",
      ar: "أريد قهوة",
      en: "I'd like coffee",
    },
    {
      he: "מה הכי פופולרי?",
      ar: "ما الأكثر شعبية؟",
      en: "What's most popular?",
    },
    {
      he: "יש משהו טבעוני?",
      ar: "هل يوجد شيء نباتي؟",
      en: "Anything vegan?",
    },
    {
      he: "אני רעב",
      ar: "أنا جائع",
      en: "I'm hungry",
    },
  ],
  quickActions: [
    {
      id: "coffee",
      emoji: "☕",
      label: { he: "קפה", ar: "قهوة", en: "Coffee" },
      action: "category",
      categoryId: "hot-drinks",
    },
    {
      id: "cold-drinks",
      emoji: "🥤",
      label: { he: "שתייה קרה", ar: "مشروب بارد", en: "Cold Drink" },
      action: "category",
      categoryId: "ice-drinks",
    },
    {
      id: "desserts",
      emoji: "🍰",
      label: { he: "קינוחים", ar: "حلويات", en: "Desserts" },
      action: "category",
      categoryId: "desserts",
    },
    {
      id: "breakfast",
      emoji: "🥐",
      label: { he: "ארוחות בוקר", ar: "فطور", en: "Breakfast" },
      action: "category",
      categoryId: "breakfast",
    },
    {
      id: "popular",
      emoji: "⭐",
      label: { he: "הכי פופולרי", ar: "الأكثر شعبية", en: "Popular" },
      action: "popular",
    },
    {
      id: "offers",
      emoji: "🎁",
      label: { he: "מבצעים", ar: "عروض", en: "Offers" },
      action: "offers",
    },
    {
      id: "cart",
      emoji: "📦",
      label: { he: "ההזמנה שלי", ar: "طلبي", en: "My Order" },
      action: "cart",
    },
  ],
  faq: [],
  crossSellRules: [
    { triggerCategoryId: "hot-drinks", suggestCategoryIds: ["bakery", "sandwiches"] },
    { triggerCategoryId: "mains-pasta", suggestCategoryIds: ["soft-drinks", "fresh-juices"] },
    { triggerCategoryId: "desserts", suggestCategoryIds: ["hot-drinks"] },
    { triggerCategoryId: "breakfast", suggestCategoryIds: ["fresh-juices", "hot-drinks"] },
  ],
  featuredProductIds: [],
  humanHandoffEnabled: true,
};

export interface AiMenuProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  available: boolean;
  isPopular: boolean;
  isNew: boolean;
}

export interface AiMenuCategory {
  id: string;
  name: string;
}

export type AiClientAction =
  | { type: "add_to_cart"; productId: string }
  | { type: "remove_from_cart"; productId: string }
  | { type: "show_cart" }
  | { type: "checkout" }
  | { type: "quick_action"; actionId: string };

export interface AiChatRequest {
  message: string;
  locale: Locale;
  cartProductIds?: string[];
  lastAddedCategoryId?: string;
}

export interface AiChatResponse {
  message: string;
  products: AiMenuProduct[];
  suggestions: string[];
  showHandoff: boolean;
  clientAction?: AiClientAction;
}

export interface AiMenuContext {
  locale: Locale;
  products: AiMenuProduct[];
  categories: AiMenuCategory[];
  config: AiAssistantConfig;
  settings: {
    phone: string;
    address: string;
    hours: string;
    whatsapp: string;
  };
  banners: { title: string; subtitle: string }[];
}
