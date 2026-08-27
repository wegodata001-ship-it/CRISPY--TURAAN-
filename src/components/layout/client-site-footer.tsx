"use client";

import { useHideCustomerChrome } from "@/hooks/useAdminPath";
import { SiteFooter } from "@/components/layout/footer";

export function ClientSiteFooter() {
  const hideChrome = useHideCustomerChrome();
  if (hideChrome) return null;
  return <SiteFooter />;
}
