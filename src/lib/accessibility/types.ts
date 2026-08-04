export type FontScale = 80 | 90 | 100 | 110 | 120;
export type ThemePreference = "light" | "dark" | "auto";
export type SpacingLevel = "normal" | "medium" | "large";

export interface AccessibilitySettings {
  fontScale: FontScale;
  highContrast: boolean;
  theme: ThemePreference;
  grayscale: boolean;
  highlightLinks: boolean;
  accessibleFont: boolean;
  lineHeight: SpacingLevel;
  letterSpacing: SpacingLevel;
  reduceMotion: boolean;
  pauseAnimations: boolean;
  largeCursor: boolean;
  enhancedFocus: boolean;
  keyboardNav: boolean;
}

export const DEFAULT_A11Y_SETTINGS: AccessibilitySettings = {
  fontScale: 100,
  highContrast: false,
  theme: "auto",
  grayscale: false,
  highlightLinks: false,
  accessibleFont: false,
  lineHeight: "normal",
  letterSpacing: "normal",
  reduceMotion: false,
  pauseAnimations: false,
  largeCursor: false,
  enhancedFocus: false,
  keyboardNav: false,
};

export const A11Y_STORAGE_KEY = "mishkat-a11y-settings";

export function parseStoredSettings(raw: string | null): AccessibilitySettings {
  if (!raw) return { ...DEFAULT_A11Y_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
    return { ...DEFAULT_A11Y_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_A11Y_SETTINGS };
  }
}

/** Maps settings → class names on <html> */
export function settingsToHtmlClasses(s: AccessibilitySettings): string[] {
  const classes: string[] = [];

  if (s.fontScale !== 100) classes.push(`a11y-text-${s.fontScale}`);
  if (s.highContrast) classes.push("a11y-high-contrast");
  if (s.grayscale) classes.push("a11y-grayscale");
  if (s.highlightLinks) classes.push("a11y-highlight-links");
  if (s.accessibleFont) classes.push("a11y-accessible-font");
  if (s.lineHeight === "medium") classes.push("a11y-line-height-md");
  if (s.lineHeight === "large") classes.push("a11y-line-height-lg");
  if (s.letterSpacing === "medium") classes.push("a11y-letter-spacing-md");
  if (s.letterSpacing === "large") classes.push("a11y-letter-spacing-lg");
  if (s.reduceMotion) classes.push("a11y-reduce-motion");
  if (s.pauseAnimations) classes.push("a11y-pause-animations");
  if (s.largeCursor) classes.push("a11y-large-cursor");
  if (s.enhancedFocus) classes.push("a11y-enhanced-focus");
  if (s.keyboardNav) classes.push("a11y-keyboard-nav");

  return classes;
}

export const A11Y_CLASS_PREFIX = "a11y-";

export function allA11yClasses(): string[] {
  return [
    "a11y-text-80",
    "a11y-text-90",
    "a11y-text-110",
    "a11y-text-120",
    "a11y-high-contrast",
    "a11y-grayscale",
    "a11y-highlight-links",
    "a11y-accessible-font",
    "a11y-line-height-md",
    "a11y-line-height-lg",
    "a11y-letter-spacing-md",
    "a11y-letter-spacing-lg",
    "a11y-reduce-motion",
    "a11y-pause-animations",
    "a11y-large-cursor",
    "a11y-enhanced-focus",
    "a11y-keyboard-nav",
  ];
}
