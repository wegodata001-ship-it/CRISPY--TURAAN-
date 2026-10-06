import type { CostingUnit } from "@/types/costing";

const TO_BASE: Record<CostingUnit, { family: "mass" | "volume" | "each"; factor: number; base: CostingUnit }> = {
  g: { family: "mass", factor: 1, base: "g" },
  kg: { family: "mass", factor: 1000, base: "g" },
  ml: { family: "volume", factor: 1, base: "ml" },
  l: { family: "volume", factor: 1000, base: "ml" },
  unit: { family: "each", factor: 1, base: "unit" },
};

export function baseUnitFor(unit: CostingUnit): CostingUnit {
  return TO_BASE[unit].base;
}

export function toBaseQuantity(quantity: number, unit: CostingUnit): { quantity: number; unit: CostingUnit } {
  const spec = TO_BASE[unit];
  return { quantity: quantity * spec.factor, unit: spec.base };
}

export function convertQuantity(
  quantity: number,
  from: CostingUnit,
  to: CostingUnit
): number | null {
  const a = TO_BASE[from];
  const b = TO_BASE[to];
  if (a.family !== b.family) return null;
  return (quantity * a.factor) / b.factor;
}

export function sameFamily(a: CostingUnit, b: CostingUnit): boolean {
  return TO_BASE[a].family === TO_BASE[b].family;
}

export function computeCostPerBaseUnit(purchasePrice: number, purchaseQuantity: number, purchaseUnit: CostingUnit) {
  const base = toBaseQuantity(purchaseQuantity, purchaseUnit);
  const costPerBaseUnit = base.quantity > 0 ? purchasePrice / base.quantity : 0;
  return {
    baseQuantity: base.quantity,
    baseUnit: base.unit,
    costPerBaseUnit,
  };
}

export function lineCost(
  quantity: number,
  unit: CostingUnit,
  costPerBaseUnit: number,
  baseUnit: CostingUnit
): number | null {
  const inBase = convertQuantity(quantity, unit, baseUnit);
  if (inBase === null) return null;
  return inBase * costPerBaseUnit;
}
