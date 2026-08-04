"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/footer";

export function ClientSiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <SiteFooter />;
}
