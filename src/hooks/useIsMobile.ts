"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind `md` breakpoint — mobile catalog UX applies below 768px */
export function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);

  return isMobile;
}

export const MOBILE_CATALOG_PAGE_SIZE = 3;
/** @deprecated Prefer CATALOG_PREVIEW_COUNT from @/lib/catalog/preview */
export const DESKTOP_CATALOG_PAGE_SIZE = 24;
