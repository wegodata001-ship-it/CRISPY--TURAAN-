import {
  Star,
  Coffee,
  Cake,
  Croissant,
  Salad,
  Utensils,
  Gift,
  ShoppingBag,
  ShoppingCart,
  Phone,
  GlassWater,
  type LucideIcon,
} from "lucide-react";

export const ASSISTANT_QUICK_ICONS: Record<string, LucideIcon> = {
  beverages: GlassWater,
  desserts: Cake,
  breakfast: Croissant,
  salads: Salad,
  mains: Utensils,
  popular: Star,
  offers: Gift,
  cart: ShoppingCart,
  checkout: ShoppingBag,
  contact: Phone,
  coffee: Coffee,
};

export function resolveAssistantIcon(action: { icon?: string; id: string }): LucideIcon {
  return ASSISTANT_QUICK_ICONS[action.icon ?? action.id] ?? Coffee;
}
