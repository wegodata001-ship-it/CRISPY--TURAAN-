export type ModifierSelectionType = "single" | "multiple" | "quantity" | "counter";
export type ModifierDisplayType =
  | "buttons"
  | "dropdown"
  | "chips"
  | "cards"
  | "icons"
  | "images";
export type ModifierRequirement = "required" | "optional";

export type BusinessRuleConditionType =
  | "option_selected"
  | "option_not_selected"
  | "group_has_selection";

export type BusinessRuleActionType =
  | "hide_group"
  | "hide_option"
  | "show_group"
  | "show_option";

export interface ModifierGroup {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  selectionType: ModifierSelectionType;
  requirement: ModifierRequirement;
  minSelections: number;
  maxSelections: number;
  displayType: ModifierDisplayType;
  sortOrder: number;
  color?: string;
  icon?: string;
  active: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModifierOption {
  id: string;
  groupId: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  priceDelta: number;
  cost: number;
  sortOrder: number;
  color?: string;
  icon?: string;
  image?: string;
  kitchenNote?: string;
  active: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductModifierGroup {
  id: string;
  productId: string;
  groupId: string;
  requirement?: ModifierRequirement;
  selectionType?: ModifierSelectionType;
  displayType?: ModifierDisplayType;
  sortOrder: number;
  active: boolean;
}

export interface ProductModifierOption {
  id: string;
  productId: string;
  optionId: string;
  priceDeltaOverride?: number;
  sortOrderOverride?: number;
  active: boolean;
}

export interface BusinessRuleCondition {
  type: BusinessRuleConditionType;
  optionId?: string;
  groupId?: string;
}

export interface BusinessRuleAction {
  type: BusinessRuleActionType;
  groupId?: string;
  optionId?: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: BusinessRuleCondition[];
  actions: BusinessRuleAction[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductSuggestion {
  id: string;
  triggerProductId: string;
  suggestedProductId: string;
  message_he?: string;
  message_ar?: string;
  message_en?: string;
  sortOrder: number;
  active: boolean;
}

export interface InventoryLink {
  id: string;
  optionId: string;
  itemName: string;
  quantityOnHand: number;
  trackInventory: boolean;
  active: boolean;
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
  quantity: number;
  kitchenNote?: string;
}

export interface ProductBuilderOption extends ModifierOption {
  effectivePriceDelta: number;
  inStock: boolean;
  hidden: boolean;
}

export interface ProductBuilderGroup {
  linkId: string;
  group: ModifierGroup;
  options: ProductBuilderOption[];
  selectionType: ModifierSelectionType;
  requirement: ModifierRequirement;
  displayType: ModifierDisplayType;
  sortOrder: number;
  hidden: boolean;
}

export interface ProductBuilderConfig {
  productId: string;
  groups: ProductBuilderGroup[];
  rules: BusinessRule[];
  suggestions: ProductSuggestion[];
}

export type SelectionState = Record<string, { optionId: string; quantity: number }[]>;
