export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  icon: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name_ar: string;
  name_en: string;
  description: string;
  categoryId: string;
  price: number;
  image: string;
  isPopular: boolean;
  isNew: boolean;
  available: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  ordersCount: number;
  lastOrder: string;
  favoriteItems: string[];
  avatar?: string;
}

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ProductFilters {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isPopular?: boolean;
  isNew?: boolean;
  available?: boolean;
  sortBy?: "newest" | "price-asc" | "price-desc" | "name-asc" | "popular";
}

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta?: string;
}
