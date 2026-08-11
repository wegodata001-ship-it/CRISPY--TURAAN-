import type {
  ModifierGroupInput,
  ModifierOptionInput,
} from "@/lib/validation/modifier-schemas";

export interface PendingModifierGroupUpdate {
  id: string;
  data: ModifierGroupInput;
}

export interface PendingModifierOptionUpdate {
  id: string;
  data: ModifierOptionInput;
}

export interface PendingModifierOptionCreate {
  key: string;
  data: ModifierOptionInput;
}

export interface PendingModifierGroupCreate {
  key: string;
  data: ModifierGroupInput;
  options: ModifierOptionInput[];
}

export interface PendingModifierChanges {
  groupUpdates: PendingModifierGroupUpdate[];
  optionUpdates: PendingModifierOptionUpdate[];
  optionCreates: PendingModifierOptionCreate[];
  groupCreates: PendingModifierGroupCreate[];
}

export const EMPTY_PENDING_MODIFIER_CHANGES: PendingModifierChanges = {
  groupUpdates: [],
  optionUpdates: [],
  optionCreates: [],
  groupCreates: [],
};

export function countPendingModifierWrites(
  changes: PendingModifierChanges
): number {
  return (
    changes.groupUpdates.length +
    changes.optionUpdates.length +
    changes.optionCreates.length +
    changes.groupCreates.length +
    changes.groupCreates.reduce(
      (count, group) => count + group.options.length,
      0
    )
  );
}
