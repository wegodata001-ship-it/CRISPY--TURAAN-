import type { Category } from "@/types";

export const categories: Category[] = [
  {
    id: "coffee",
    name_en: "Coffee",
    name_ar: "قهوة",
    icon: "coffee",
    sortOrder: 1,
  },
  {
    id: "cold-drinks",
    name_en: "Cold Drinks",
    name_ar: "مشروبات باردة",
    icon: "glass-water",
    sortOrder: 2,
  },
  {
    id: "crepes",
    name_en: "Crepes",
    name_ar: "كريب",
    icon: "utensils",
    sortOrder: 3,
  },
  {
    id: "desserts",
    name_en: "Desserts",
    name_ar: "حلويات",
    icon: "cake",
    sortOrder: 4,
  },
  {
    id: "breakfast",
    name_en: "Breakfast",
    name_ar: "فطور",
    icon: "egg-fried",
    sortOrder: 5,
  },
  {
    id: "special-offers",
    name_en: "Special Offers",
    name_ar: "عروض خاصة",
    icon: "sparkles",
    sortOrder: 6,
  },
];

export const banners = [
  {
    id: "banner-1",
    title: "Morning Ritual",
    subtitle: "Freshly roasted espresso & artisan pastries",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80",
    cta: "Explore Coffee",
  },
  {
    id: "banner-2",
    title: "Sweet Moments",
    subtitle: "Handcrafted desserts made daily",
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1200&q=80",
    cta: "View Desserts",
  },
  {
    id: "banner-3",
    title: "Weekend Brunch",
    subtitle: "Premium breakfast plates from 8 AM",
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1200&q=80",
    cta: "Order Now",
  },
];
