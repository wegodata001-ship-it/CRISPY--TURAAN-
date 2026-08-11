export type ModifierTemplateOption = {
  nameHe: string;
  priceDelta?: number;
};

export type ModifierTemplate = {
  id: string;
  labelKey: string;
  nameHe: string;
  selectionType: "single" | "multiple";
  required: boolean;
  options: ModifierTemplateOption[];
};

export const MODIFIER_TEMPLATES: ModifierTemplate[] = [
  {
    id: "ice",
    labelKey: "admin.productForm.templateIce",
    nameHe: "קרח",
    selectionType: "single",
    required: false,
    options: [
      { nameHe: "ללא קרח" },
      { nameHe: "מעט קרח" },
      { nameHe: "רגיל" },
      { nameHe: "הרבה קרח" },
    ],
  },
  {
    id: "milk",
    labelKey: "admin.productForm.templateMilk",
    nameHe: "סוג חלב",
    selectionType: "single",
    required: false,
    options: [
      { nameHe: "חלב רגיל" },
      { nameHe: "חלב 1%" },
      { nameHe: "חלב סויה", priceDelta: 3 },
    ],
  },
  {
    id: "cup",
    labelKey: "admin.productForm.templateCup",
    nameHe: "סוג כוס",
    selectionType: "single",
    required: false,
    options: [{ nameHe: "זכוכית" }, { nameHe: "חד פעמי" }, { nameHe: "צבעוני" }],
  },
  {
    id: "size",
    labelKey: "admin.productForm.templateSize",
    nameHe: "גודל",
    selectionType: "single",
    required: true,
    options: [
      { nameHe: "קטן" },
      { nameHe: "בינוני", priceDelta: 2 },
      { nameHe: "גדול", priceDelta: 4 },
    ],
  },
  {
    id: "sandwich",
    labelKey: "admin.productForm.templateSandwich",
    nameHe: "תוספות לכריך",
    selectionType: "multiple",
    required: false,
    options: [
      { nameHe: "חסה" },
      { nameHe: "עגבניה" },
      { nameHe: "מלפפון חמוץ" },
      { nameHe: "בצל", priceDelta: 1 },
    ],
  },
];
