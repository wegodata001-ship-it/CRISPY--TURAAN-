import type { Locale } from "@/lib/i18n/types";

export type LocalizedText = Record<Locale, string>;

export type QuickActionType =
  | "category"
  | "categories"
  | "popular"
  | "offers"
  | "cart"
  | "checkout"
  | "contact"
  | "product"
  | "page"
  | "whatsapp"
  | "question";

export interface AssistantQuickAction {
  id: string;
  icon: string;
  label: LocalizedText;
  action: QuickActionType;
  categoryId?: string;
  categoryIds?: string[];
  productId?: string;
  url?: string;
  question?: LocalizedText;
  enabled: boolean;
  sortOrder: number;
}

export interface AssistantFaqItem {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
  keywords: string[];
  enabled: boolean;
  sortOrder: number;
}

export interface AssistantLinks {
  phone?: string;
  whatsapp?: string;
  mapsUrl?: string;
}

export interface AssistantConfig {
  enabled: boolean;
  greeting: LocalizedText;
  suggestedQuestions: LocalizedText[];
  quickActions: AssistantQuickAction[];
  faq: AssistantFaqItem[];
  featuredProductIds: string[];
  links: AssistantLinks;
}

export const BEVERAGE_CATEGORIES = [
  "hot-drinks",
  "ice-drinks",
  "soft-drinks",
  "fresh-juices",
  "shakes",
] as const;

export const DEFAULT_ASSISTANT_CONFIG: AssistantConfig = {
  enabled: true,
  greeting: {
    he: "שלום!\n\nאני העוזר של MISHKAT CAFÉ.\n\nאיך אפשר לעזור?\n\nאפשר לבחור אחת מהאפשרויות למטה.",
    ar: "مرحباً!\n\nأنا مساعد MISHKAT CAFÉ.\n\nكيف يمكنني مساعدتك؟\n\nاختر أحد الخيارات أدناه.",
    en: "Hello!\n\nI'm the MISHKAT CAFÉ assistant.\n\nHow can I help?\n\nChoose one of the options below.",
  },
  suggestedQuestions: [
    { he: "שעות פתיחה", ar: "ساعات العمل", en: "Opening hours" },
    { he: "כתובת", ar: "العنوان", en: "Address" },
    { he: "טלפון", ar: "الهاتف", en: "Phone" },
    { he: "איסוף עצמי", ar: "استلام ذاتي", en: "Pickup" },
  ],
  quickActions: [
    {
      id: "beverages",
      icon: "beverages",
      label: { he: "כל המשקאות", ar: "كل المشروبات", en: "All beverages" },
      action: "categories",
      categoryIds: [...BEVERAGE_CATEGORIES],
      enabled: true,
      sortOrder: 0,
    },
    {
      id: "desserts",
      icon: "desserts",
      label: { he: "כל הקינוחים", ar: "كل الحلويات", en: "All desserts" },
      action: "category",
      categoryId: "desserts",
      enabled: true,
      sortOrder: 1,
    },
    {
      id: "breakfast",
      icon: "breakfast",
      label: { he: "ארוחות בוקר", ar: "فطور", en: "Breakfast" },
      action: "category",
      categoryId: "breakfast",
      enabled: true,
      sortOrder: 2,
    },
    {
      id: "salads",
      icon: "salads",
      label: { he: "סלטים", ar: "سلطات", en: "Salads" },
      action: "category",
      categoryId: "salads",
      enabled: true,
      sortOrder: 3,
    },
    {
      id: "mains",
      icon: "mains",
      label: { he: "מנות עיקריות", ar: "أطباق رئيسية", en: "Main dishes" },
      action: "category",
      categoryId: "mains-pasta",
      enabled: true,
      sortOrder: 4,
    },
    {
      id: "popular",
      icon: "popular",
      label: { he: "הכי פופולרי", ar: "الأكثر شعبية", en: "Most popular" },
      action: "popular",
      enabled: true,
      sortOrder: 5,
    },
    {
      id: "offers",
      icon: "offers",
      label: { he: "מבצעים", ar: "عروض", en: "Offers" },
      action: "offers",
      enabled: true,
      sortOrder: 6,
    },
    {
      id: "cart",
      icon: "cart",
      label: { he: "העגלה שלי", ar: "سلتي", en: "My cart" },
      action: "cart",
      enabled: true,
      sortOrder: 7,
    },
    {
      id: "checkout",
      icon: "checkout",
      label: { he: "ההזמנה שלי", ar: "طلبي", en: "My order" },
      action: "checkout",
      enabled: true,
      sortOrder: 8,
    },
    {
      id: "contact",
      icon: "contact",
      label: { he: "צור קשר", ar: "اتصل بنا", en: "Contact us" },
      action: "contact",
      enabled: true,
      sortOrder: 9,
    },
  ],
  faq: [],
  featuredProductIds: [],
  links: {},
};

export interface AssistantProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  categoryName?: string;
  available: boolean;
  isPopular: boolean;
  isNew: boolean;
  searchText?: string;
}

export interface AssistantCartItem {
  productId: string;
  quantity: number;
}

export type AssistantClientAction =
  | { type: "add_to_cart"; productId: string }
  | { type: "remove_from_cart"; productId: string }
  | { type: "show_cart" }
  | { type: "checkout" }
  | { type: "open_url"; url: string };

export interface AssistantChatRequest {
  message: string;
  locale: Locale;
  cartProductIds?: string[];
  cartItems?: AssistantCartItem[];
  productId?: string;
  quickActionId?: string;
}

export interface AssistantChatResponse {
  message: string;
  products: AssistantProduct[];
  suggestions: string[];
  showContact?: boolean;
  showCart?: boolean;
  clientAction?: AssistantClientAction;
}

export interface AssistantContext {
  locale: Locale;
  products: AssistantProduct[];
  categories: { id: string; name: string; searchText: string }[];
  config: AssistantConfig;
  settings: {
    phone: string;
    address: string;
    hours: string;
    whatsapp: string;
    mapsUrl: string;
  };
  banners: { title: string; subtitle: string }[];
}

export const ASSISTANT_DOC_ID = "config";
