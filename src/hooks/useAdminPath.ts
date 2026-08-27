"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  adminPath,
  getAdminSurface,
  isLocalDevHost,
  isPortalHost,
  portalUrl,
  shouldHideCustomerChrome,
  type AdminSurface,
} from "@/lib/domains/host-routing";

export function useAdminSurface(): AdminSurface {
  return useMemo(() => {
    if (typeof window === "undefined") return "dev";
    return getAdminSurface(window.location.hostname);
  }, []);
}

export function useAdminPath() {
  const surface = useAdminSurface();

  return useMemo(
    () =>
      (segment: Parameters<typeof adminPath>[0]) => adminPath(segment, surface),
    [surface]
  );
}

export function useIsPortalHost(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    return isPortalHost(window.location.hostname);
  }, []);
}

export function useHideCustomerChrome(): boolean {
  const pathname = usePathname();
  return useMemo(() => {
    if (typeof window === "undefined") return pathname.startsWith("/admin");
    return shouldHideCustomerChrome(pathname, window.location.hostname);
  }, [pathname]);
}

/** Admin links from the public storefront (full portal URL in production). */
export function useAdminExternalHref() {
  return useMemo(() => {
    return (segment: Parameters<typeof adminPath>[0]) => {
      if (typeof window !== "undefined" && isLocalDevHost(window.location.hostname)) {
        return adminPath(segment, "dev");
      }
      return portalUrl(adminPath(segment, "portal"));
    };
  }, []);
}
