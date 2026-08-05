"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "next-themes";
import {
  A11Y_STORAGE_KEY,
  DEFAULT_A11Y_SETTINGS,
  allA11yClasses,
  parseStoredSettings,
  settingsToHtmlClasses,
  type AccessibilitySettings,
  type FontScale,
  type SpacingLevel,
  type ThemePreference,
} from "@/lib/accessibility/types";

type AccessibilityContextValue = {
  settings: AccessibilitySettings;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  increaseFont: () => void;
  decreaseFont: () => void;
  setFontScale: (scale: FontScale) => void;
  setThemePreference: (theme: ThemePreference) => void;
  resetAll: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const FONT_STEPS: FontScale[] = [80, 90, 100, 110, 120];

function applyToDocument(settings: AccessibilitySettings) {
  const root = document.documentElement;
  allA11yClasses().forEach((c) => root.classList.remove(c));
  settingsToHtmlClasses(settings).forEach((c) => root.classList.add(c));
}

function themeToNext(theme: ThemePreference): string {
  return theme === "auto" ? "system" : theme;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_A11Y_SETTINGS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = parseStoredSettings(localStorage.getItem(A11Y_STORAGE_KEY));
    setSettings(stored);
    applyToDocument(stored);
    // Only override next-themes when user set an explicit light/dark preference in a11y.
    // "auto" must NOT reset next-themes — that was breaking the admin theme toggle.
    if (stored.theme === "light" || stored.theme === "dark") {
      setTheme(stored.theme);
    }
    setHydrated(true);
  }, [setTheme]);

  const persist = useCallback(
    (next: AccessibilitySettings) => {
      setSettings(next);
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
      applyToDocument(next);
    },
    []
  );

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
        applyToDocument(next);
        if (key === "theme") {
          setTheme(themeToNext(value as ThemePreference));
        }
        return next;
      });
    },
    [setTheme]
  );

  const increaseFont = useCallback(() => {
    setSettings((prev) => {
      const idx = FONT_STEPS.indexOf(prev.fontScale);
      const nextScale = FONT_STEPS[Math.min(idx + 1, FONT_STEPS.length - 1)] ?? 120;
      const next = { ...prev, fontScale: nextScale };
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
      applyToDocument(next);
      return next;
    });
  }, []);

  const decreaseFont = useCallback(() => {
    setSettings((prev) => {
      const idx = FONT_STEPS.indexOf(prev.fontScale);
      const nextScale = FONT_STEPS[Math.max(idx - 1, 0)] ?? 80;
      const next = { ...prev, fontScale: nextScale };
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
      applyToDocument(next);
      return next;
    });
  }, []);

  const setFontScale = useCallback((scale: FontScale) => {
    setSettings((prev) => {
      const next = { ...prev, fontScale: scale };
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
      applyToDocument(next);
      return next;
    });
  }, []);

  const setThemePreference = useCallback(
    (theme: ThemePreference) => {
      updateSetting("theme", theme);
    },
    [updateSetting]
  );

  const resetAll = useCallback(() => {
    const next = { ...DEFAULT_A11Y_SETTINGS };
    persist(next);
    setTheme(themeToNext(next.theme));
  }, [persist, setTheme]);

  const value = useMemo(
    () => ({
      settings,
      panelOpen,
      setPanelOpen,
      togglePanel: () => setPanelOpen((p) => !p),
      updateSetting,
      increaseFont,
      decreaseFont,
      setFontScale,
      setThemePreference,
      resetAll,
    }),
    [
      settings,
      panelOpen,
      updateSetting,
      increaseFont,
      decreaseFont,
      setFontScale,
      setThemePreference,
      resetAll,
    ]
  );

  if (!hydrated) {
    return (
      <AccessibilityContext.Provider value={value}>
        {children}
      </AccessibilityContext.Provider>
    );
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}

export type { SpacingLevel, ThemePreference, FontScale };
