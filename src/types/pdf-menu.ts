export type PdfPageSize = "AUTO" | "QUARTER" | "HALF" | "THREE_QUARTERS" | "FULL";
export type PdfLayout = "1-column" | "2-columns" | "3-columns" | "list" | "grid" | "image-cards";
export type PdfDirection = "rtl" | "ltr";
export type PdfLanguage = "ar" | "he" | "en";
export type ArrangeMode = "auto" | "manual";
export type PageKind = "cover" | "content" | "blank" | "offer" | "image" | "custom";
export type PageTemplateId =
  | "cover"
  | "minimal"
  | "image-focus"
  | "elegant"
  | "split"
  | "two-categories"
  | "full-background"
  | "promo";

export const PAGE_SIZE_CAPACITY: Record<Exclude<PdfPageSize, "AUTO">, number> = {
  QUARTER: 25,
  HALF: 50,
  THREE_QUARTERS: 75,
  FULL: 100,
};

export interface PdfCoverSettings {
  enabled: boolean;
  logoUrl: string;
  backgroundUrl: string;
  businessName: string;
  subtitle: string;
  phone: string;
  instagram: string;
  whatsapp: string;
  qrUrl: string;
  showQr: boolean;
}

export interface PdfFooterSettings {
  enabled: boolean;
  businessName: string;
  phone: string;
  instagram: string;
  website: string;
  showPageNumber: boolean;
}

export interface PdfQrSettings {
  enabled: boolean;
  url: string;
  position: "cover" | "last-page" | "footer";
  size: number;
}

export interface PageCustomSettings {
  backgroundColor: string;
  backgroundImageUrl: string;
  accentColor: string;
  textColor: string;
  headingColor: string;
  fontSize: "sm" | "md" | "lg";
  imageSize: "sm" | "md" | "lg";
  productSpacing: number;
  borderRadius: number;
  columns: number;
  alignment: "start" | "center";
}

export interface PdfMenuPageCategorySlot {
  categoryId: string;
  sortOrder: number;
  size: number;
}

export interface PdfMenuPageRecord {
  id: string;
  templateId: string;
  sortOrder: number;
  pageTemplateId: PageTemplateId;
  pageKind: PageKind;
  locked: boolean;
  customSettings: PageCustomSettings;
  categorySlots: PdfMenuPageCategorySlot[];
  createdAt: string;
  updatedAt: string;
}

export interface PdfMenuTemplate {
  id: string;
  name: string;
  active: boolean;
  language: PdfLanguage;
  direction: PdfDirection;
  arrangeMode: ArrangeMode;
  coverSettings: PdfCoverSettings;
  footerSettings: PdfFooterSettings;
  qrSettings: PdfQrSettings;
  createdAt: string;
  updatedAt: string;
}

export interface PdfMenuCategorySetting {
  id: string;
  templateId: string;
  categoryId: string;
  visible: boolean;
  sortOrder: number;
  pageSize: PdfPageSize;
  manualPageNumber: number | null;
  startOnNewPage: boolean;
  keepTogether: boolean;
  locked: boolean;
  layout: PdfLayout;
  columns: number;
  showTitle: boolean;
  showDescription: boolean;
  showImages: boolean;
  showPrices: boolean;
  showCurrency: boolean;
  backgroundColor: string;
  backgroundImageUrl: string;
  titleColor: string;
  textColor: string;
  accentColor: string;
}

export interface PdfMenuProductSetting {
  id: string;
  templateId: string;
  productId: string;
  visible: boolean;
  sortOrder: number;
  showImageOverride: boolean | null;
  showDescriptionOverride: boolean | null;
  showPriceOverride: boolean | null;
}

export interface MenuPage {
  id: string;
  pageNumber: number;
  sortOrder: number;
  pageTemplateId: PageTemplateId;
  pageKind: PageKind;
  usedCapacity: number;
  categories: PdfMenuCategoryWithProducts[];
  locked: boolean;
  customSettings: PageCustomSettings;
  recommendedTemplateId: PageTemplateId;
}

export interface PdfMenuCategoryWithProducts {
  setting: PdfMenuCategorySetting;
  category: { id: string; name: string; image: string };
  products: PdfMenuProductView[];
  computedSize: number;
  continuation?: boolean;
}

export interface PdfMenuProductView {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  visible: boolean;
  sortOrder: number;
}

export const DEFAULT_COVER_SETTINGS: PdfCoverSettings = {
  enabled: true,
  logoUrl: "",
  backgroundUrl: "",
  businessName: "MISHKAT CAFÉ",
  subtitle: "",
  phone: "",
  instagram: "",
  whatsapp: "",
  qrUrl: "",
  showQr: true,
};

export const DEFAULT_FOOTER_SETTINGS: PdfFooterSettings = {
  enabled: true,
  businessName: "MISHKAT CAFÉ",
  phone: "",
  instagram: "",
  website: "",
  showPageNumber: true,
};

export const DEFAULT_QR_SETTINGS: PdfQrSettings = {
  enabled: false,
  url: "",
  position: "last-page",
  size: 120,
};

export const DEFAULT_PAGE_CUSTOM_SETTINGS: PageCustomSettings = {
  backgroundColor: "#FFFFFF",
  backgroundImageUrl: "",
  accentColor: "#2c9c8c",
  textColor: "#1a1410",
  headingColor: "#1a1410",
  fontSize: "md",
  imageSize: "md",
  productSpacing: 8,
  borderRadius: 12,
  columns: 2,
  alignment: "start",
};

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface PdfMenuPageSlot {
  id: string;
  categoryIds: string[];
}

export interface PdfMenuCustomColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

export interface PdfMenuDraft {
  selectedCategoryIds: string[];
  excludedProductIds: string[];
  layoutMode: ArrangeMode;
  pageOrder: PdfMenuPageSlot[];
  templateId: PageTemplateId;
  colorThemeId: string;
  customColors: PdfMenuCustomColors;
  showLogo: boolean;
  showCover: boolean;
  showQr: boolean;
  currentStep: WizardStep;
  categorySizes: Record<string, PdfPageSize>;
  logoOverrideUrl: string;
  pageTemplateOverrides: Record<string, PageTemplateId>;
}

export const DEFAULT_CUSTOM_COLORS: PdfMenuCustomColors = {
  primary: "#9B4B5A",
  secondary: "#E8A87C",
  background: "#FFF5F0",
  text: "#3D2B24",
  accent: "#E07A5F",
};

export const DEFAULT_PDF_DRAFT: PdfMenuDraft = {
  selectedCategoryIds: [],
  excludedProductIds: [],
  layoutMode: "auto",
  pageOrder: [],
  templateId: "elegant",
  colorThemeId: "rose-cream",
  customColors: DEFAULT_CUSTOM_COLORS,
  showLogo: true,
  showCover: true,
  showQr: true,
  currentStep: 1,
  categorySizes: {},
  logoOverrideUrl: "",
  pageTemplateOverrides: {},
};

export const DEFAULT_CATEGORY_SETTING: Omit<PdfMenuCategorySetting, "id" | "templateId" | "categoryId" | "sortOrder"> = {
  visible: true,
  pageSize: "AUTO",
  manualPageNumber: null,
  startOnNewPage: false,
  keepTogether: true,
  locked: false,
  layout: "2-columns",
  columns: 2,
  showTitle: true,
  showDescription: true,
  showImages: true,
  showPrices: true,
  showCurrency: true,
  backgroundColor: "",
  backgroundImageUrl: "",
  titleColor: "",
  textColor: "",
  accentColor: "",
};
