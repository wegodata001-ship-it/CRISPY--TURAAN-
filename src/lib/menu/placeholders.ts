/** Category placeholder images — replace via admin when real photos are ready */
export const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  "soft-drinks":
    "https://images.unsplash.com/photo-1622483767028-3aa137008f97?w=800&q=80",
  "fresh-juices":
    "https://images.unsplash.com/photo-1622597467836-fbc1a2b8c9c2?w=800&q=80",
  shakes:
    "https://images.unsplash.com/photo-1505252587541-4a1d2f5f656e?w=800&q=80",
  "hot-drinks":
    "https://images.unsplash.com/photo-1514432324607-09a9bf4a0374?w=800&q=80",
  "ice-drinks":
    "https://images.unsplash.com/photo-1461023058943-f07a80b96202?w=800&q=80",
  breakfast:
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
  sandwiches:
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80",
  salads:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
  "mains-pasta":
    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80",
  bakery:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
  desserts:
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80",
  "ice-cream-yogurt":
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80",
};

export function getCategoryPlaceholder(categoryId: string): string {
  return (
    CATEGORY_PLACEHOLDERS[categoryId] ??
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80"
  );
}
