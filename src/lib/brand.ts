/** Central brand asset paths */
export const BRAND = {
  /** Display logo — transparent PNG derived from logo.png */
  logo: "/logo-transparent.png",
  /** Original asset preserved in repo */
  logoOriginal: "/logo.png",
  /** width / height from public/logo.png */
  logoAspect: 1059 / 931,
  store: "/store.jpg",
  /** Local fallback when remote store image fails */
  storeFallback: "/store.jpg",
  name: "MISHKAT CAFÉ",
  nameShort: "Mishkat",
  tagline: "Coffee • Crêpes • Desserts",
  taglineAlt: "Where Light Meets Coffee",
  welcome: "Welcome to",
} as const;

/** Sampled from official logo & storefront */
export const BRAND_COLORS = {
  primary: "#3D2B24",
  primaryLight: "#5a4038",
  secondary: "#D4A76A",
  accent: "#007A80",
  accentLight: "#0099a0",
  cream: "#F8F3ED",
  warmWhite: "#FFFEFB",
} as const;

/** Tiny blur placeholders for Next/Image */
export const BLUR = {
  logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  store: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAD8AVAX/AP/Z",
} as const;

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Logo display heights — mobile 38–48px, desktop 48–64px */
export const LOGO_HEIGHT: Record<LogoSize, number> = {
  xs: 32,
  sm: 40,
  md: 48,
  lg: 56,
  xl: 64,
};

/** Resolve hero/store image: Firestore settings URL → local file */
export function getStoreImageSrc(settingsUrl?: string | null): string {
  if (settingsUrl?.trim()) return settingsUrl.trim();
  return BRAND.store;
}

/** Official logo — always the local transparent asset */
export function getLogoSrc(_settingsUrl?: string | null): string {
  return BRAND.logo;
}
