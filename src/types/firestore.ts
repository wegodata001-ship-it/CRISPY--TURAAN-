import { Timestamp } from "firebase/firestore";
import type { OrderStatus } from "@/types";

export interface FirestoreCategory {
  nameAr: string;
  nameEn: string;
  icon: string;
  sortOrder: number;
  active: boolean;
}

export interface FirestoreProduct {
  nameAr: string;
  nameEn: string;
  description: string;
  categoryId: string;
  price: number;
  imageUrl: string;
  available: boolean;
  popular: boolean;
  newProduct: boolean;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreCustomer {
  name: string;
  phone: string;
  email: string;
  address: string;
  favoriteProducts: string[];
  ordersCount: number;
  lastOrder: Timestamp | null;
  createdAt: Timestamp;
}

export interface FirestoreOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface FirestoreOrder {
  orderNumber: string;
  customerId: string;
  customerName: string;
  items: FirestoreOrderItem[];
  status: OrderStatus;
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  paymentMethod: string;
  notes: string;
  createdAt: Timestamp;
}

export interface FirestoreBanner {
  title: string;
  subtitle: string;
  imageUrl: string;
  cta?: string;
  active: boolean;
  sortOrder: number;
}

export type FirestoreDoc<T> = T & { id: string };

export function timestampToIso(value: Timestamp | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value.toDate().toISOString();
}

export function isoToTimestamp(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

export function nowTimestamp(): Timestamp {
  return Timestamp.now();
}
