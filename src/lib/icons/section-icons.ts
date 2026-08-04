import {
  Star,
  Flame,
  Sparkles,
  Coffee,
  Cake,
  Croissant,
  LayoutGrid,
  Gift,
  Snowflake,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

/** Shared Lucide icons for catalog sections — consistent stroke & size at call site */
export const SECTION_ICONS = {
  bestSellers: Star,
  popular: Flame,
  new: Sparkles,
  coffee: Coffee,
  desserts: Cake,
  breakfast: Croissant,
  categories: LayoutGrid,
  offers: Gift,
} as const satisfies Record<string, LucideIcon>;

export type SectionIconKey = keyof typeof SECTION_ICONS;

export const AI_QUICK_ICONS: Record<string, LucideIcon> = {
  coffee: Coffee,
  "cold-drinks": Snowflake,
  desserts: Cake,
  breakfast: Croissant,
  popular: Star,
  offers: Gift,
  cart: ShoppingBag,
};

/** Legacy Firestore docs may still have emoji — map to icon keys */
export const EMOJI_TO_ICON: Record<string, string> = {
  "☕": "coffee",
  "🥤": "cold-drinks",
  "🍰": "desserts",
  "🥐": "breakfast",
  "⭐": "popular",
  "🎁": "offers",
  "📦": "cart",
};

export function resolveQuickActionIcon(action: {
  icon?: string;
  emoji?: string;
  id: string;
}): LucideIcon {
  if (action.icon && AI_QUICK_ICONS[action.icon]) {
    return AI_QUICK_ICONS[action.icon]!;
  }
  if (action.emoji && EMOJI_TO_ICON[action.emoji]) {
    return AI_QUICK_ICONS[EMOJI_TO_ICON[action.emoji]!] ?? Coffee;
  }
  return AI_QUICK_ICONS[action.id] ?? Coffee;
}
