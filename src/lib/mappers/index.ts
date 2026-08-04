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

export function mapCategory(doc: FirestoreDoc<FirestoreCategory>): Category {
  return {
    id: doc.id,
    name_ar: doc.nameAr,
    name_en: doc.nameEn,
    icon: doc.icon,
    image: doc.imageUrl ?? "",
    sortOrder: doc.sortOrder,
    active: doc.active,
  };
}

export function mapProduct(doc: FirestoreDoc<FirestoreProduct>): Product {
  return {
    id: doc.id,
    name_ar: doc.nameAr,
    name_en: doc.nameEn,
    description: doc.description,
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
    lastOrder: timestampToIso(doc.lastOrder),
    favoriteItems: doc.favoriteProducts,
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

export function mapBanner(doc: FirestoreDoc<FirestoreBanner>): BannerSlide {
  return {
    id: doc.id,
    title: doc.title,
    subtitle: doc.subtitle,
    image: doc.imageUrl,
    cta: doc.cta,
  };
}
