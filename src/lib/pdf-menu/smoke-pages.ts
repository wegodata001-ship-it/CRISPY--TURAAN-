import type { MenuPage, PdfMenuCategoryWithProducts, PdfMenuTemplate } from "@/types/pdf-menu";
import {
  DEFAULT_CATEGORY_SETTING,
  DEFAULT_COVER_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_PAGE_CUSTOM_SETTINGS,
  DEFAULT_QR_SETTINGS,
} from "@/types/pdf-menu";

function cat(
  id: string,
  name: string,
  products: { id: string; name: string; price: number; image?: string; description?: string }[],
  computedSize: number,
  image = ""
): PdfMenuCategoryWithProducts {
  return {
    setting: {
      ...DEFAULT_CATEGORY_SETTING,
      id: `s-${id}`,
      templateId: "wizard",
      categoryId: id,
      sortOrder: 0,
    },
    category: { id, name, image },
    products: products.map((p, sortOrder) => ({
      ...p,
      description: p.description ?? "",
      image: p.image ?? "",
      visible: true,
      sortOrder,
    })),
    computedSize,
  };
}

const COFFEE = {
  backgroundColor: "#F8F3ED",
  backgroundImageUrl: "",
  accentColor: "#D4A76A",
  textColor: "#3D2B24",
  headingColor: "#3D2B24",
};

const PHOTO = "/meskahphoto.png";

function page(
  id: string,
  pageNumber: number,
  templateId: MenuPage["pageTemplateId"],
  categories: PdfMenuCategoryWithProducts[],
  customSettings?: MenuPage["customSettings"]
): MenuPage {
  return {
    id,
    pageNumber,
    sortOrder: pageNumber - 1,
    pageTemplateId: templateId,
    pageKind: templateId === "cover" ? "cover" : "content",
    usedCapacity: categories.reduce((s, c) => s + c.computedSize, 0),
    categories,
    locked: false,
    customSettings: customSettings ?? {
      ...DEFAULT_PAGE_CUSTOM_SETTINGS,
      ...COFFEE,
      columns: categories.length === 2 ? 2 : 2,
    },
    recommendedTemplateId: templateId,
  };
}

export function createSmokeMenuExport(): { pages: MenuPage[]; template: PdfMenuTemplate } {
  const template: PdfMenuTemplate = {
    id: "smoke",
    name: "قائمة PDF",
    active: true,
    language: "ar",
    direction: "rtl",
    arrangeMode: "auto",
    coverSettings: {
      ...DEFAULT_COVER_SETTINGS,
      enabled: true,
      logoUrl: "/logo-transparent.png",
      businessName: "MISHKAT CAFÉ",
      subtitle: "القائمة",
      phone: "050-000-0000",
      instagram: "mishkat.cafe",
      showQr: true,
      qrUrl: "/logo-transparent.png",
    },
    footerSettings: {
      ...DEFAULT_FOOTER_SETTINGS,
      enabled: true,
      businessName: "MISHKAT CAFÉ",
      instagram: "mishkat.cafe",
      showPageNumber: true,
    },
    qrSettings: { ...DEFAULT_QR_SETTINGS, enabled: true },
    createdAt: "",
    updatedAt: "",
  };

  const hot = cat("hot", "مشروبات ساخنة", [
    { id: "h1", name: "نسكافيه", price: 14 },
    { id: "h2", name: "لاتيه", price: 14 },
    { id: "h3", name: "كابتشينو", price: 12 },
    { id: "h4", name: "إسبريسو مزدوج", price: 12 },
    { id: "h5", name: "إسبريسو قصير", price: 10 },
    { id: "h6", name: "الشوكولاتة الساخنة", price: 18 },
    { id: "h7", name: "موكا", price: 18 },
  ], 50);

  const broken = "https://firebasestorage.googleapis.com/v0/b/mshkah.firebasestorage.app/o/products%2Fmissing-broken.jpg?alt=media&token=dead";

  const coffee = cat("coffee", "القهوة", [
    { id: "c1", name: "إسبريسو قصير", price: 10, image: broken },
    { id: "c2", name: "إسبريسو طويل", price: 10, image: broken },
    { id: "c3", name: "كابتشينو", price: 14, image: broken },
    { id: "c4", name: "نسكافيه", price: 14 },
    { id: "c5", name: "لاتيه", price: 16 },
  ], 50);

  const tea = cat("tea", "الشاي", [
    { id: "t1", name: "شاي بالنعناع", price: 12, image: broken },
    { id: "t2", name: "شاي أخضر", price: 12, image: broken },
    { id: "t3", name: "شاي أحمر", price: 10 },
  ], 25);

  const few = cat("few", "العصائر الطازجة", [
    { id: "j1", name: "برتقال طازج", price: 16 },
    { id: "j2", name: "ليمون ونعناع", price: 16 },
    { id: "j3", name: "مانجو", price: 18 },
  ], 25);

  const desserts = cat("desserts", "حلويات", [
    { id: "d1", name: "كنافة", price: 22, description: "جبنة عكاوي" },
    { id: "d2", name: "بقلاوة", price: 18 },
    { id: "d3", name: "تشيز كيك", price: 24 },
    { id: "d4", name: "تيراميسو", price: 24 },
    { id: "d5", name: "براوني", price: 20 },
    { id: "d6", name: "كوكيز", price: 14 },
    { id: "d7", name: "كرواسون", price: 12 },
    { id: "d8", name: "سينابون", price: 16 },
    { id: "d9", name: "كيك الشوكولاتة", price: 22 },
    { id: "d10", name: "تارت الفواكه", price: 20 },
    { id: "d11", name: "أوم علي", price: 18 },
    { id: "d12", name: "مهلبيّة", price: 14 },
  ], 100);

  const plates = cat("plates", "فطور", [
    { id: "p1", name: "فطور عربي", price: 38, image: PHOTO, description: "بيضتان حسب الاختيار، أجبان، زيتون، خبز طازج وصلصات البيت" },
    { id: "p2", name: "أفوكادو توست", price: 32, image: PHOTO, description: "خبز محمص، أفوكادو، بيضة مسلوقة وبذور حسب الموسم" },
    { id: "p3", name: "شكشوكة", price: 34, image: PHOTO, description: "بيض على صلصة بندورة مع زيتون وخبز" },
    { id: "p4", name: "بيض مسلوق", price: 18, image: PHOTO },
  ], 75);

  const shortDesc = "بيضتان حسب الاختيار مع خبز";
  const mediumDesc = "اوراق خضراء, خيار, بندورة شيري, بصل ليلكي, فقع مشوح بصوص ترياكي";
  const longDesc =
    "تشمل 8 صلصات وبيض عيون أو عجة أو بيض مخلط، لبنة، زبدة وعسل، شوكولاتة، جبنة فيتا، تونة، زيتون، سلطة عربية وسلطة موسمية مع خبز طازج.";
  const veryLongDesc =
    "إفطار لشخصين: بيضتان للاختيار من بينها (عيون / عجة / مخلط)، إضافات جانبية من اللبنة والجبنة والزيتون والعسل، خبز طازج، سلطة عربية، تونة، وأصناف موسمية حسب التوفر. يمكن مشاركة الصحن مع إضافة قهوة أو عصير حسب القائمة.";

  const breakfast = cat("breakfast", "فطور", [
    { id: "bf1", name: "إفطار لشخصين", price: 120, description: veryLongDesc },
    { id: "bf2", name: "وجبة فطور شخصية", price: 68, description: longDesc },
    { id: "bf3", name: "شكشوكة", price: 34, description: shortDesc },
  ], 100);

  const salads = cat("salads", "سلطات", [
    { id: "s1", name: "سلطة حلومي", price: 42, description: mediumDesc },
    { id: "s2", name: "سلطة قيصر", price: 38, description: "اوراق خس, خبز محمص, جرجير, بارميزان ولوز" },
    { id: "s3", name: "سلطة شريمس", price: 48, description: "لبنة, شيري, بصل احمر, واوراق خضراء, مع صوص فينغريت بالثوم والليمون" },
    { id: "s4", name: "سلطة موسمية بأوراق خضراء طازجة ومكونات البيت", price: 36, description: longDesc },
  ], 100);

  const pages: MenuPage[] = [
    page("cover", 1, "cover", [], {
      ...DEFAULT_PAGE_CUSTOM_SETTINGS,
      backgroundColor: "#3D2B24",
      accentColor: "#D4A76A",
      textColor: "#F8F3ED",
      headingColor: "#F8F3ED",
    }),
    page("elegant", 2, "elegant", [hot]),
    page("two-small", 3, "two-categories", [coffee, tea]),
    page("few", 4, "minimal", [few]),
    page("dense", 5, "elegant", [desserts]),
    page("images", 6, "image-focus", [plates]),
    page("promo", 7, "promo", [few, tea], {
      ...DEFAULT_PAGE_CUSTOM_SETTINGS,
      ...COFFEE,
      columns: 1,
      accentColor: "#E07A5F",
    }),
    page("split", 8, "split", [hot]),
    page("descriptions", 9, "elegant", [breakfast]),
    page("salads", 10, "elegant", [salads]),
  ];

  return { pages, template };
}
