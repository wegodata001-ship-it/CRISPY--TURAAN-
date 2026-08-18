import type {
  MenuPage,
  PageCustomSettings,
  PageKind,
  PageTemplateId,
  PdfMenuCategoryWithProducts,
} from "@/types/pdf-menu";
import { DEFAULT_PAGE_CUSTOM_SETTINGS as DEFAULTS } from "@/types/pdf-menu";

export interface PageTemplateDefinition {
  id: PageTemplateId;
  nameAr: string;
  nameHe: string;
  nameEn: string;
  descriptionAr: string;
  thumbnail: {
    bg: string;
    accent: string;
    pattern: "list" | "cards" | "elegant" | "split" | "stack" | "overlay" | "promo" | "cover";
  };
  defaultSettings: PageCustomSettings;
  supportedKinds: PageKind[];
}

export const PAGE_TEMPLATES: PageTemplateDefinition[] = [
  {
    id: "minimal",
    nameAr: "بسيط",
    nameHe: "מינימלי",
    nameEn: "Minimal",
    descriptionAr: "خلفية فاتحة، عنوان كبير، قائمة نظيفة",
    thumbnail: { bg: "#FFF8F3", accent: "#2c9c8c", pattern: "list" },
    defaultSettings: { ...DEFAULTS, columns: 1, imageSize: "sm", fontSize: "md" },
    supportedKinds: ["content", "custom"],
  },
  {
    id: "image-focus",
    nameAr: "تركيز على الصور",
    nameHe: "מיקוד בתמונות",
    nameEn: "Image Focus",
    descriptionAr: "بطاقات كبيرة مع اسم وسعر تحت الصورة",
    thumbnail: { bg: "#FFFDF9", accent: "#E8A87C", pattern: "cards" },
    defaultSettings: { ...DEFAULTS, columns: 2, imageSize: "lg", fontSize: "sm" },
    supportedKinds: ["content", "offer"],
  },
  {
    id: "elegant",
    nameAr: "قائمة أنيقة",
    nameHe: "תפריט אלגנטי",
    nameEn: "Elegant Menu",
    descriptionAr: "طباعة قوية، أسعار بمحاذاة الجانب، قليل من الصور",
    thumbnail: { bg: "#FAF6F1", accent: "#1a1410", pattern: "elegant" },
    defaultSettings: { ...DEFAULTS, columns: 1, imageSize: "sm", fontSize: "lg" },
    supportedKinds: ["content"],
  },
  {
    id: "split",
    nameAr: "تقسيم الصفحة",
    nameHe: "פריסה מפוצלת",
    nameEn: "Split Layout",
    descriptionAr: "نصف صورة ونصف منتجات",
    thumbnail: { bg: "#FFFFFF", accent: "#C4A484", pattern: "split" },
    defaultSettings: { ...DEFAULTS, columns: 1, imageSize: "lg" },
    supportedKinds: ["content", "image"],
  },
  {
    id: "two-categories",
    nameAr: "فئتان",
    nameHe: "שתי קטגוריות",
    nameEn: "Two Categories",
    descriptionAr: "فئة أعلى وأخرى أسفل، أو عمودين",
    thumbnail: { bg: "#FFF8F3", accent: "#2c9c8c", pattern: "stack" },
    defaultSettings: { ...DEFAULTS, columns: 2, imageSize: "sm" },
    supportedKinds: ["content"],
  },
  {
    id: "full-background",
    nameAr: "خلفية كاملة",
    nameHe: "רקע מלא",
    nameEn: "Full Background",
    descriptionAr: "صورة خلفية مع طبقة شفافة والمنتجات فوقها",
    thumbnail: { bg: "#3D2B1F", accent: "#FFFFFF", pattern: "overlay" },
    defaultSettings: {
      ...DEFAULTS,
      backgroundColor: "#2A1C14",
      textColor: "#FFF8F3",
      headingColor: "#FFFFFF",
      accentColor: "#E8A87C",
      columns: 2,
    },
    supportedKinds: ["content", "image"],
  },
  {
    id: "promo",
    nameAr: "ملون",
    nameHe: "צבעוני",
    nameEn: "Colorful",
    descriptionAr: "ألوان واضحة، صور بارزة، أسعار مميزة",
    thumbnail: { bg: "#FFF3EA", accent: "#E07A5F", pattern: "promo" },
    defaultSettings: { ...DEFAULTS, columns: 2, imageSize: "lg", fontSize: "lg", accentColor: "#E07A5F" },
    supportedKinds: ["offer", "content"],
  },
  {
    id: "cover",
    nameAr: "غلاف",
    nameHe: "שער",
    nameEn: "Cover",
    descriptionAr: "صفحة غلاف مع الشعار ومعلومات التواصل",
    thumbnail: { bg: "#1a1410", accent: "#E8A87C", pattern: "cover" },
    defaultSettings: {
      ...DEFAULTS,
      backgroundColor: "#1a1410",
      textColor: "#FFFFFF",
      headingColor: "#FFFFFF",
      accentColor: "#E8A87C",
    },
    supportedKinds: ["cover"],
  },
];

export const WIZARD_TEMPLATE_IDS: PageTemplateId[] = [
  "minimal",
  "elegant",
  "split",
  "image-focus",
  "promo",
  "two-categories",
];

export const WIZARD_TEMPLATES = PAGE_TEMPLATES.filter((t) => WIZARD_TEMPLATE_IDS.includes(t.id));
export const CONTENT_PAGE_TEMPLATES = PAGE_TEMPLATES.filter((t) => t.id !== "cover");

export function getPageTemplate(id: PageTemplateId): PageTemplateDefinition {
  return PAGE_TEMPLATES.find((t) => t.id === id) ?? PAGE_TEMPLATES[0]!;
}

export function recommendPageTemplate(input: {
  pageKind?: PageKind;
  categoryCount: number;
  productCount: number;
  imageCount: number;
}): PageTemplateId {
  if (input.pageKind === "cover") return "cover";
  if (input.pageKind === "offer") return "promo";
  if (input.pageKind === "image") return "split";
  if (input.categoryCount >= 2) return "two-categories";

  const imageRatio = input.productCount === 0 ? 0 : input.imageCount / input.productCount;
  if (input.productCount >= 8 && imageRatio >= 0.7) return "image-focus";
  if (imageRatio < 0.3 && input.productCount >= 4) return "elegant";
  if (input.categoryCount === 1 && input.productCount >= 10) return "split";
  return "minimal";
}

export function recommendFromPage(page: Pick<MenuPage, "pageKind" | "categories">): PageTemplateId {
  const products = page.categories.flatMap((c) => c.products.filter((p) => p.visible));
  return recommendPageTemplate({
    pageKind: page.pageKind,
    categoryCount: page.categories.length,
    productCount: products.length,
    imageCount: products.filter((p) => Boolean(p.image)).length,
  });
}

export function categoryFingerprint(categories: PdfMenuCategoryWithProducts[]): string {
  return categories.map((c) => c.setting.categoryId).sort().join("|");
}
