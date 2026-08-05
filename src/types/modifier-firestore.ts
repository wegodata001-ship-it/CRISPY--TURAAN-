import { Timestamp } from "firebase/firestore";
import type {
  BusinessRuleActionType,
  BusinessRuleConditionType,
  ModifierDisplayType,
  ModifierRequirement,
  ModifierSelectionType,
} from "@/types/modifiers";

export interface FirestoreModifierGroup {
  nameHe: string;
  nameAr: string;
  nameEn: string;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreModifierOption {
  groupId: string;
  nameHe: string;
  nameAr: string;
  nameEn: string;
  priceDelta: number;
  cost: number;
  sortOrder: number;
  color?: string;
  icon?: string;
  imageUrl?: string;
  kitchenNote?: string;
  active: boolean;
  archived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreProductModifierGroup {
  productId: string;
  groupId: string;
  requirement?: ModifierRequirement;
  selectionType?: ModifierSelectionType;
  displayType?: ModifierDisplayType;
  sortOrder: number;
  active: boolean;
}

export interface FirestoreProductModifierOption {
  productId: string;
  optionId: string;
  priceDeltaOverride?: number;
  sortOrderOverride?: number;
  active: boolean;
}

export interface FirestoreBusinessRuleCondition {
  type: BusinessRuleConditionType;
  optionId?: string;
  groupId?: string;
}

export interface FirestoreBusinessRuleAction {
  type: BusinessRuleActionType;
  groupId?: string;
  optionId?: string;
}

export interface FirestoreBusinessRule {
  name: string;
  enabled: boolean;
  priority: number;
  conditions: FirestoreBusinessRuleCondition[];
  actions: FirestoreBusinessRuleAction[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreProductSuggestion {
  triggerProductId: string;
  suggestedProductId: string;
  messageHe?: string;
  messageAr?: string;
  messageEn?: string;
  sortOrder: number;
  active: boolean;
}

export interface FirestoreInventoryLink {
  optionId: string;
  itemName: string;
  quantityOnHand: number;
  trackInventory: boolean;
  active: boolean;
}

export interface FirestoreOrderModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
  quantity: number;
  kitchenNote?: string;
}
