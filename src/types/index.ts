export type BusinessType = "beverage" | "food" | "bakery" | "dessert" | "dairy";

export interface Category {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  icon: string;
  image: string;
  color: string;
  sortOrder: number;
  active: boolean;
  parentId?: string | null;
}

export interface Product {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  description_he: string;
  description_ar: string;
  description_en: string;
  categoryId: string;
  subcategoryId?: string | null;
  price: number;
  cost: number;
  profit: number;
  businessType: BusinessType;
  image: string;
  isPopular: boolean;
  isNew: boolean;
  available: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  ordersCount: number;
  totalSpending: number;
  lastOrder: string;
  favoriteItems: string[];
  notes: string;
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
  basePrice?: number;
  modifiers?: import("@/types/modifiers").SelectedModifier[];
  notes?: string;
  kitchenNotes?: string[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  delivery?: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export interface CartItem {
  lineId: string;
  product: Product;
  quantity: number;
  selections: import("@/types/modifiers").SelectedModifier[];
  unitPrice: number;
  notes?: string;
}

export interface ProductFilters {
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isPopular?: boolean;
  isNew?: boolean;
  available?: boolean;
  active?: boolean;
  sortBy?: "newest" | "price-asc" | "price-desc" | "name-asc" | "popular";
}

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  title_he?: string;
  title_ar?: string;
  title_en?: string;
  subtitle_he?: string;
  subtitle_ar?: string;
  subtitle_en?: string;
  button_he?: string;
  button_ar?: string;
  button_en?: string;
  image: string;
  mobileImage?: string;
  cta?: string;
  ctaUrl?: string;
  active: boolean;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
}
