import type { PdfMenuCustomColors } from "@/types/pdf-menu";

export interface PdfColorTheme {
  id: string;
  nameAr: string;
  swatches: string[];
  colors: PdfMenuCustomColors;
  coverBg: string;
  coverText: string;
}

export const PDF_COLOR_THEMES: PdfColorTheme[] = [
  {
    id: "rose-cream",
    nameAr: "وردي + كريمي",
    swatches: ["#FFF5F0", "#E8A87C", "#9B4B5A"],
    colors: { primary: "#9B4B5A", secondary: "#F3D3C2", background: "#FFF5F0", text: "#3D2B24", accent: "#E07A5F" },
    coverBg: "#9B4B5A",
    coverText: "#FFF8F3",
  },
  {
    id: "coffee-beige",
    nameAr: "بني + بيج",
    swatches: ["#F8F3ED", "#D4A76A", "#3D2B24"],
    colors: { primary: "#3D2B24", secondary: "#EDE4D8", background: "#F8F3ED", text: "#3D2B24", accent: "#D4A76A" },
    coverBg: "#3D2B24",
    coverText: "#F8F3ED",
  },
  {
    id: "black-gold",
    nameAr: "أسود + ذهب",
    swatches: ["#1A1410", "#D4A76A", "#F8F3ED"],
    colors: { primary: "#D4A76A", secondary: "#2A211C", background: "#1A1410", text: "#F8F3ED", accent: "#D4A76A" },
    coverBg: "#1A1410",
    coverText: "#F8F3ED",
  },
  {
    id: "green-cream",
    nameAr: "أخضر + كريمي",
    swatches: ["#F4FAF7", "#2C9C8C", "#1F4D3A"],
    colors: { primary: "#1F4D3A", secondary: "#D7EFEA", background: "#F4FAF7", text: "#1A1410", accent: "#2C9C8C" },
    coverBg: "#1F4D3A",
    coverText: "#F4FAF7",
  },
  {
    id: "blue-white",
    nameAr: "أزرق + أبيض",
    swatches: ["#F7FBFF", "#3B82A8", "#1E3A5F"],
    colors: { primary: "#1E3A5F", secondary: "#D6E8F2", background: "#F7FBFF", text: "#1A1410", accent: "#3B82A8" },
    coverBg: "#1E3A5F",
    coverText: "#F7FBFF",
  },
];

export function getColorTheme(id: string, custom: PdfMenuCustomColors): PdfColorTheme {
  if (id === "custom") {
    return {
      id: "custom",
      nameAr: "مخصص",
      swatches: [custom.background, custom.accent, custom.primary],
      colors: custom,
      coverBg: custom.primary,
      coverText: "#FFFFFF",
    };
  }
  return PDF_COLOR_THEMES.find((t) => t.id === id) ?? PDF_COLOR_THEMES[0]!;
}
