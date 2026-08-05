import { z } from "zod";

export const businessTypeSchema = z.enum([
  "beverage",
  "food",
  "bakery",
  "dessert",
  "dairy",
]);

const trilingualName = {
  nameHe: z.string().min(1),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
};

const trilingualDescription = {
  descriptionHe: z.string().min(1),
  descriptionAr: z.string().min(1),
  descriptionEn: z.string().min(1),
};

export const categorySchema = z.object({
  ...trilingualName,
  icon: z.string().min(1, "Icon is required"),
  imageUrl: z.string().url("Image URL must be valid").optional(),
  color: z.string().default("#8B6914"),
  sortOrder: z.number().int().min(0),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  ...trilingualName,
  ...trilingualDescription,
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().positive("Price must be greater than 0"),
  cost: z.number().min(0).default(0),
  profit: z.number().default(0),
  businessType: businessTypeSchema.default("food"),
  imageUrl: z.string().url("Image URL must be valid"),
  available: z.boolean().default(true),
  popular: z.boolean().default(false),
  newProduct: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(5, "Phone is required"),
  email: z.string().email("Valid email is required").or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  favoriteProducts: z.array(z.string()).default([]),
  notes: z.string().default(""),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  basePrice: z.number().min(0).optional(),
  modifiers: z
    .array(
      z.object({
        groupId: z.string(),
        groupName: z.string(),
        optionId: z.string(),
        optionName: z.string(),
        priceDelta: z.number(),
        quantity: z.number().int().positive(),
        kitchenNote: z.string().optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
  kitchenNotes: z.array(z.string()).optional(),
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
  mobileImageUrl: z.string().url().optional().or(z.literal("")),
  cta: z.string().optional(),
  ctaUrl: z.string().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
