/** Central brand asset paths */
export const BRAND = {
  /** Official CRISPY / Almostafa Chicken logo */
  logo: "/logo.png",
  logoOriginal: "/logo.png",
  /** width / height from public/logo.png */
  logoAspect: 1182 / 1330,
  store: "/logo.png",
  storeFallback: "/logo.png",
  name: "CRISPY",
  nameShort: "CRISPY",
  publicName: "Almostafa Chicken",
  tagline: "קריספי & שניצל",
  taglineAlt: "חם. קריספי. בדיוק כמו שצריך.",
  welcome: "Welcome to",
} as const;

export const BRAND_COLORS = {
  primary: "#D71920",
  primaryLight: "#A90F16",
  secondary: "#F6B800",
  accent: "#D71920",
  accentLight: "#A90F16",
  cream: "#FFF5E6",
  warmWhite: "#FFFFFF",
  black: "#171717",
  muted: "#6B625A",
  border: "#EADBC8",
  success: "#2E9B55",
} as const;

export const BLUR = {
  logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  store: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAD8AVAX/AP/Z",
} as const;

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

export const LOGO_HEIGHT: Record<LogoSize, number> = {
  xs: 36,
  sm: 48,
  md: 56,
  lg: 72,
  xl: 88,
};

export function getStoreImageSrc(settingsUrl?: string | null): string {
  if (settingsUrl?.trim()) return settingsUrl.trim();
  return BRAND.store;
}

export function getLogoSrc(_settingsUrl?: string | null): string {
  return BRAND.logo;
}
