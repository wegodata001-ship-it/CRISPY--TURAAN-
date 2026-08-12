import type {
  ModifierGroupInput,
  ModifierOptionInput,
} from "@/lib/validation/modifier-schemas";
import type { ProductModifierGroup } from "@/types/modifiers";

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

/** Per-product group link settings (does not mutate the global AddonGroup). */
export interface PendingLinkOverride {
  groupId: string;
  requirement?: ProductModifierGroup["requirement"];
  selectionType?: ProductModifierGroup["selectionType"];
  displayType?: ProductModifierGroup["displayType"];
  /** false = hide group on this product only */
  active: boolean;
}

/** Per-product option visibility/price (does not mutate the global Option). */
export interface PendingOptionOverride {
  optionId: string;
  groupId: string;
  active: boolean;
  priceDeltaOverride?: number;
  sortOrderOverride?: number;
}

export interface PendingModifierChanges {
  groupUpdates: PendingModifierGroupUpdate[];
  optionUpdates: PendingModifierOptionUpdate[];
  optionCreates: PendingModifierOptionCreate[];
  groupCreates: PendingModifierGroupCreate[];
  linkOverrides: PendingLinkOverride[];
  optionOverrides: PendingOptionOverride[];
}

export const EMPTY_PENDING_MODIFIER_CHANGES: PendingModifierChanges = {
  groupUpdates: [],
  optionUpdates: [],
  optionCreates: [],
  groupCreates: [],
  linkOverrides: [],
  optionOverrides: [],
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
    ) +
    changes.linkOverrides.length +
    changes.optionOverrides.length
  );
}
