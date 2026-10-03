"use client";

import { usePathname } from "next/navigation";
import { useHideCustomerChrome } from "@/hooks/useAdminPath";
import { SiteFooter } from "@/components/layout/footer";

export function ClientSiteFooter() {
  const hideChrome = useHideCustomerChrome();
  const pathname = usePathname();
  if (hideChrome) return null;
  if (pathname === "/" || pathname === "/catalog") return null;
  return <SiteFooter />;
}
