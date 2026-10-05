import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isPortalHost } from "@/lib/domains/host-routing";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");

  if (isPortalHost(host)) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout", "/account"] },
    ],
  };
}
