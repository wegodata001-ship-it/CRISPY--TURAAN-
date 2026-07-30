import { z } from "zod";

export const categorySchema = z.object({
  nameAr: z.string().min(1, "Arabic name is required"),
  nameEn: z.string().min(1, "English name is required"),
  icon: z.string().min(1, "Icon is required"),
  sortOrder: z.number().int().min(0),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  nameAr: z.string().min(1, "Arabic name is required"),
  nameEn: z.string().min(1, "English name is required"),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().positive("Price must be greater than 0"),
  imageUrl: z.string().url("Image URL must be valid"),
  available: z.boolean().default(true),
  popular: z.boolean().default(false),
  newProduct: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(5, "Phone is required"),
  email: z.string().email("Valid email is required").or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  favoriteProducts: z.array(z.string()).default([]),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

export const orderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  customerName: z.string().min(1),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  status: z.enum(["pending", "preparing", "ready", "delivered", "cancelled"]),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  delivery: z.number().min(0).default(0),
  total: z.number().positive("Total must be greater than 0"),
  paymentMethod: z.string().default("cash"),
  notes: z.string().default(""),
});

export const bannerSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  imageUrl: z.string().url(),
  cta: z.string().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
