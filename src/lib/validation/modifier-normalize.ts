import type { ModifierGroupInput, ModifierOptionInput } from "@/lib/validation/modifier-schemas";

/** Admin UI allows Hebrew-only; duplicate into ar/en before Firestore validation */
export function normalizeModifierGroupInput(
  input: Partial<ModifierGroupInput> & { nameHe: string }
): ModifierGroupInput {
  const nameHe = input.nameHe.trim();
  const nameAr = (input.nameAr?.trim() || nameHe).trim();
  const nameEn = (input.nameEn?.trim() || nameHe).trim();
  const selectionType = input.selectionType === "multiple" ? "multiple" : "single";
  const isMultiple = selectionType === "multiple";
  const requirement = input.requirement ?? "optional";
  const required = requirement === "required";

  let minSelections = isMultiple ? Math.max(0, input.minSelections ?? 0) : 0;
  let maxSelections = isMultiple ? Math.max(1, input.maxSelections ?? 2) : 1;
  if (required) minSelections = Math.max(1, minSelections);
  if (!isMultiple) {
    minSelections = required ? 1 : 0;
    maxSelections = 1;
  }
  if (minSelections > maxSelections) maxSelections = minSelections;

  return {
    nameHe,
    nameAr,
    nameEn,
    selectionType,
    requirement,
    minSelections,
    maxSelections,
    displayType: input.displayType ?? "buttons",
    sortOrder: input.sortOrder ?? 0,
    ...(input.color ? { color: input.color } : {}),
    ...(input.icon ? { icon: input.icon } : {}),
    active: input.active ?? true,
    archived: input.archived ?? false,
  };
}

export function normalizeModifierOptionInput(
  input: Partial<ModifierOptionInput> & { groupId: string; nameHe: string }
): ModifierOptionInput {
  const nameHe = input.nameHe.trim();
  return {
    groupId: input.groupId,
    nameHe,
    nameAr: (input.nameAr?.trim() || nameHe).trim(),
    nameEn: (input.nameEn?.trim() || nameHe).trim(),
    priceDelta: input.priceDelta ?? 0,
    cost: input.cost ?? 0,
    sortOrder: input.sortOrder ?? 0,
    ...(input.color ? { color: input.color } : {}),
    ...(input.icon ? { icon: input.icon } : {}),
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    ...(input.kitchenNote ? { kitchenNote: input.kitchenNote } : {}),
    active: input.active ?? true,
    archived: input.archived ?? false,
  };
}
