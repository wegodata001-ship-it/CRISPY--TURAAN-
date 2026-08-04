import type {
  FirestoreCategory,
  FirestoreProduct,
  FirestoreCustomer,
  FirestoreOrder,
  FirestoreBanner,
  FirestoreDoc,
} from "@/types/firestore";
import { timestampToIso } from "@/types/firestore";
import type {
  Category,
  Product,
  Customer,
  Order,
  BannerSlide,
  BusinessType,
} from "@/types";

/** Legacy docs stored Hebrew in `nameAr` before trilingual migration */
function readNameHe(doc: { nameHe?: string; nameAr?: string }): string {
  return doc.nameHe ?? doc.nameAr ?? "";
}

function readNameAr(doc: { nameHe?: string; nameAr?: string }): string {
  if (doc.nameHe && doc.nameAr && doc.nameHe !== doc.nameAr) return doc.nameAr;
  return doc.nameAr ?? "";
}

function readDescription(
  doc: { descriptionHe?: string; descriptionAr?: string; descriptionEn?: string; description?: string },
  lang: "he" | "ar" | "en"
): string {
  const legacy = doc.description ?? "";
  switch (lang) {
    case "he":
      return doc.descriptionHe ?? legacy;
    case "ar":
      return doc.descriptionAr ?? legacy;
    case "en":
      return doc.descriptionEn ?? legacy;
  }
}

export function mapCategory(doc: FirestoreDoc<FirestoreCategory>): Category {
  return {
    id: doc.id,
    name_he: readNameHe(doc),
    name_ar: readNameAr(doc),
    name_en: doc.nameEn ?? "",
    icon: doc.icon,
    image: doc.imageUrl ?? "",
    color: doc.color ?? "#8B6914",
    sortOrder: doc.sortOrder,
    active: doc.active,
  };
}

export function mapProduct(doc: FirestoreDoc<FirestoreProduct>): Product {
  return {
    id: doc.id,
    name_he: readNameHe(doc),
    name_ar: readNameAr(doc),
    name_en: doc.nameEn ?? "",
    description_he: readDescription(doc, "he"),
    description_ar: readDescription(doc, "ar"),
    description_en: readDescription(doc, "en"),
    categoryId: doc.categoryId,
    price: doc.price,
    cost: doc.cost ?? 0,
    profit: doc.profit ?? 0,
    businessType: (doc.businessType ?? "food") as BusinessType,
    image: doc.imageUrl,
    isPopular: doc.popular,
    isNew: doc.newProduct,
    available: doc.available,
    active: doc.active ?? true,
    sortOrder: doc.sortOrder,
    createdAt: timestampToIso(doc.createdAt),
    updatedAt: timestampToIso(doc.updatedAt),
  };
}

export function mapCustomer(doc: FirestoreDoc<FirestoreCustomer>): Customer {
  return {
    id: doc.id,
    name: doc.name,
    phone: doc.phone,
    address: doc.address,
    ordersCount: doc.ordersCount,
    totalSpending: doc.totalSpending ?? 0,
    lastOrder: timestampToIso(doc.lastOrder),
    favoriteItems: doc.favoriteProducts,
    notes: doc.notes ?? "",
  };
}

export function mapOrder(doc: FirestoreDoc<FirestoreOrder>): Order {
  return {
    id: doc.id,
    orderNumber: doc.orderNumber,
    customerId: doc.customerId,
    customerName: doc.customerName,
    status: doc.status,
    items: doc.items,
    total: doc.total,
    createdAt: timestampToIso(doc.createdAt),
  };
}

function isBannerScheduled(banner: FirestoreBanner): boolean {
  const now = Date.now();
  if (banner.startDate && new Date(banner.startDate).getTime() > now) return false;
  if (banner.endDate && new Date(banner.endDate).getTime() < now) return false;
  return true;
}

export function mapBanner(doc: FirestoreDoc<FirestoreBanner>): BannerSlide {
  return {
    id: doc.id,
    title: doc.title,
    subtitle: doc.subtitle,
    image: doc.imageUrl,
    mobileImage: doc.mobileImageUrl,
    cta: doc.cta,
    ctaUrl: doc.ctaUrl,
    active: doc.active,
    sortOrder: doc.sortOrder,
    startDate: doc.startDate,
    endDate: doc.endDate,
  };
}

export function isBannerLive(banner: BannerSlide): boolean {
  if (!banner.active) return false;
  const now = Date.now();
  if (banner.startDate && new Date(banner.startDate).getTime() > now) return false;
  if (banner.endDate && new Date(banner.endDate).getTime() < now) return false;
  return true;
}

export { isBannerScheduled };

/** Firestore write shape from app product */
export function productToFirestore(input: {
  name_he: string;
  name_ar: string;
  name_en: string;
  description_he: string;
  description_ar: string;
  description_en: string;
  categoryId: string;
  price: number;
  cost: number;
  profit: number;
  businessType: BusinessType;
  imageUrl: string;
  available: boolean;
  popular: boolean;
  newProduct: boolean;
  active: boolean;
  sortOrder: number;
}) {
  return {
    nameHe: input.name_he,
    nameAr: input.name_ar,
    nameEn: input.name_en,
    descriptionHe: input.description_he,
    descriptionAr: input.description_ar,
    descriptionEn: input.description_en,
    categoryId: input.categoryId,
    price: input.price,
    cost: input.cost,
    profit: input.profit,
    businessType: input.businessType,
    imageUrl: input.imageUrl,
    available: input.available,
    popular: input.popular,
    newProduct: input.newProduct,
    active: input.active,
    sortOrder: input.sortOrder,
  };
}

export function categoryToFirestore(input: {
  name_he: string;
  name_ar: string;
  name_en: string;
  icon: string;
  imageUrl?: string;
  color?: string;
  sortOrder: number;
  active: boolean;
}) {
  return {
    nameHe: input.name_he,
    nameAr: input.name_ar,
    nameEn: input.name_en,
    icon: input.icon,
    imageUrl: input.imageUrl ?? "",
    color: input.color ?? "#8B6914",
    sortOrder: input.sortOrder,
    active: input.active,
  };
}
