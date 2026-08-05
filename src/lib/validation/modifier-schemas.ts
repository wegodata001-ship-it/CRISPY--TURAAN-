import { z } from "zod";

const trilingualName = {
  nameHe: z.string().min(1),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
};

export const modifierSelectionTypeSchema = z.enum([
  "single",
  "multiple",
  "quantity",
  "counter",
]);

export const modifierDisplayTypeSchema = z.enum([
  "buttons",
  "dropdown",
  "chips",
  "cards",
  "icons",
  "images",
]);

export const modifierRequirementSchema = z.enum(["required", "optional"]);

export const modifierGroupSchema = z.object({
  ...trilingualName,
  selectionType: modifierSelectionTypeSchema.default("single"),
  requirement: modifierRequirementSchema.default("optional"),
  minSelections: z.number().int().min(0).default(0),
  maxSelections: z.number().int().min(1).default(1),
  displayType: modifierDisplayTypeSchema.default("buttons"),
  sortOrder: z.number().int().min(0).default(0),
  color: z.string().optional(),
  icon: z.string().optional(),
  active: z.boolean().default(true),
  archived: z.boolean().default(false),
});

export const modifierOptionSchema = z.object({
  groupId: z.string().min(1),
  ...trilingualName,
  priceDelta: z.number().min(0).default(0),
  cost: z.number().min(0).default(0),
  sortOrder: z.number().int().min(0).default(0),
  color: z.string().optional(),
  icon: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  kitchenNote: z.string().optional(),
  active: z.boolean().default(true),
  archived: z.boolean().default(false),
});

export const productModifierGroupSchema = z.object({
  productId: z.string().min(1),
  groupId: z.string().min(1),
  requirement: modifierRequirementSchema.optional(),
  selectionType: modifierSelectionTypeSchema.optional(),
  displayType: modifierDisplayTypeSchema.optional(),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const productModifierOptionSchema = z.object({
  productId: z.string().min(1),
  optionId: z.string().min(1),
  priceDeltaOverride: z.number().min(0).optional(),
  sortOrderOverride: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
});

export const businessRuleConditionSchema = z.object({
  type: z.enum(["option_selected", "option_not_selected", "group_has_selection"]),
  optionId: z.string().optional(),
  groupId: z.string().optional(),
});

export const businessRuleActionSchema = z.object({
  type: z.enum(["hide_group", "hide_option", "show_group", "show_option"]),
  groupId: z.string().optional(),
  optionId: z.string().optional(),
});

export const businessRuleSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  conditions: z.array(businessRuleConditionSchema).min(1),
  actions: z.array(businessRuleActionSchema).min(1),
});

export const productSuggestionSchema = z.object({
  triggerProductId: z.string().min(1),
  suggestedProductId: z.string().min(1),
  messageHe: z.string().optional(),
  messageAr: z.string().optional(),
  messageEn: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const inventoryLinkSchema = z.object({
  optionId: z.string().min(1),
  itemName: z.string().min(1),
  quantityOnHand: z.number().int().min(0).default(0),
  trackInventory: z.boolean().default(true),
  active: z.boolean().default(true),
});

export type ModifierGroupInput = z.infer<typeof modifierGroupSchema>;
export type ModifierOptionInput = z.infer<typeof modifierOptionSchema>;
export type ProductModifierGroupInput = z.infer<typeof productModifierGroupSchema>;
export type ProductModifierOptionInput = z.infer<typeof productModifierOptionSchema>;
export type BusinessRuleInput = z.infer<typeof businessRuleSchema>;
export type ProductSuggestionInput = z.infer<typeof productSuggestionSchema>;
export type InventoryLinkInput = z.infer<typeof inventoryLinkSchema>;
