import type {
  FirestoreModifierGroup,
  FirestoreModifierOption,
  FirestoreProductModifierGroup,
  FirestoreProductModifierOption,
  FirestoreBusinessRule,
  FirestoreProductSuggestion,
  FirestoreInventoryLink,
  FirestoreOrderModifier,
} from "@/types/modifier-firestore";
import { timestampToIso } from "@/types/firestore";
import type { FirestoreDoc } from "@/types/firestore";
import type {
  ModifierGroup,
  ModifierOption,
  ProductModifierGroup,
  ProductModifierOption,
  BusinessRule,
  ProductSuggestion,
  InventoryLink,
  SelectedModifier,
} from "@/types/modifiers";

function readNameHe(doc: { nameHe?: string; nameAr?: string }): string {
  return doc.nameHe ?? doc.nameAr ?? "";
}

function readNameAr(doc: { nameHe?: string; nameAr?: string }): string {
  if (doc.nameHe && doc.nameAr && doc.nameHe !== doc.nameAr) return doc.nameAr;
  return doc.nameAr ?? "";
}

export function mapModifierGroup(doc: FirestoreDoc<FirestoreModifierGroup>): ModifierGroup {
  return {
    id: doc.id,
    name_he: readNameHe(doc),
    name_ar: readNameAr(doc),
    name_en: doc.nameEn ?? "",
    selectionType: doc.selectionType,
    requirement: doc.requirement,
    minSelections: doc.minSelections ?? 0,
    maxSelections: doc.maxSelections ?? 1,
    displayType: doc.displayType,
    sortOrder: doc.sortOrder,
    color: doc.color,
    icon: doc.icon,
    active: doc.active,
    archived: doc.archived ?? false,
    createdAt: timestampToIso(doc.createdAt),
    updatedAt: timestampToIso(doc.updatedAt),
  };
}

export function mapModifierOption(doc: FirestoreDoc<FirestoreModifierOption>): ModifierOption {
  return {
    id: doc.id,
    groupId: doc.groupId,
    name_he: readNameHe(doc),
    name_ar: readNameAr(doc),
    name_en: doc.nameEn ?? "",
    priceDelta: doc.priceDelta ?? 0,
    cost: doc.cost ?? 0,
    sortOrder: doc.sortOrder,
    color: doc.color,
    icon: doc.icon,
    image: doc.imageUrl,
    kitchenNote: doc.kitchenNote,
    active: doc.active,
    archived: doc.archived ?? false,
    createdAt: timestampToIso(doc.createdAt),
    updatedAt: timestampToIso(doc.updatedAt),
  };
}

export function mapProductModifierGroup(
  doc: FirestoreDoc<FirestoreProductModifierGroup>
): ProductModifierGroup {
  return {
    id: doc.id,
    productId: doc.productId,
    groupId: doc.groupId,
    requirement: doc.requirement,
    selectionType: doc.selectionType,
    displayType: doc.displayType,
    sortOrder: doc.sortOrder,
    active: doc.active,
  };
}

export function mapProductModifierOption(
  doc: FirestoreDoc<FirestoreProductModifierOption>
): ProductModifierOption {
  return {
    id: doc.id,
    productId: doc.productId,
    optionId: doc.optionId,
    priceDeltaOverride: doc.priceDeltaOverride,
    sortOrderOverride: doc.sortOrderOverride,
    active: doc.active,
  };
}

export function mapBusinessRule(doc: FirestoreDoc<FirestoreBusinessRule>): BusinessRule {
  return {
    id: doc.id,
    name: doc.name,
    enabled: doc.enabled,
    priority: doc.priority,
    conditions: doc.conditions ?? [],
    actions: doc.actions ?? [],
    createdAt: timestampToIso(doc.createdAt),
    updatedAt: timestampToIso(doc.updatedAt),
  };
}

export function mapProductSuggestion(
  doc: FirestoreDoc<FirestoreProductSuggestion>
): ProductSuggestion {
  return {
    id: doc.id,
    triggerProductId: doc.triggerProductId,
    suggestedProductId: doc.suggestedProductId,
    message_he: doc.messageHe,
    message_ar: doc.messageAr,
    message_en: doc.messageEn,
    sortOrder: doc.sortOrder,
    active: doc.active,
  };
}

export function mapInventoryLink(doc: FirestoreDoc<FirestoreInventoryLink>): InventoryLink {
  return {
    id: doc.id,
    optionId: doc.optionId,
    itemName: doc.itemName,
    quantityOnHand: doc.quantityOnHand,
    trackInventory: doc.trackInventory,
    active: doc.active,
  };
}

export function selectedModifierToFirestore(mod: SelectedModifier): FirestoreOrderModifier {
  const result: FirestoreOrderModifier = {
    groupId: mod.groupId,
    groupName: mod.groupName,
    optionId: mod.optionId,
    optionName: mod.optionName,
    priceDelta: mod.priceDelta,
    quantity: mod.quantity,
  };
  if (mod.kitchenNote?.trim()) {
    result.kitchenNote = mod.kitchenNote.trim();
  }
  return result;
}

export function firestoreModifierToSelected(mod: FirestoreOrderModifier): SelectedModifier {
  return {
    groupId: mod.groupId,
    groupName: mod.groupName,
    optionId: mod.optionId,
    optionName: mod.optionName,
    priceDelta: mod.priceDelta,
    quantity: mod.quantity,
    kitchenNote: mod.kitchenNote,
  };
}
