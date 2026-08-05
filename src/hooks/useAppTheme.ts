"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAccessibility } from "@/components/providers/accessibility-provider";

/**
 * Unified theme toggle — syncs next-themes + accessibility localStorage.
 * Use resolvedTheme (not theme) so "system" / hydration undefined don't break toggling.
 */
export function useAppTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const { updateSetting } = useAccessibility();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const setLightDark = useCallback(
    (mode: "light" | "dark") => {
      setTheme(mode);
      updateSetting("theme", mode);
    },
    [setTheme, updateSetting]
  );

  const toggleTheme = useCallback(() => {
    setLightDark(isDark ? "light" : "dark");
  }, [isDark, setLightDark]);

  return { mounted, isDark, toggleTheme, setLightDark, resolvedTheme };
}
