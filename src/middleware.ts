import { NextRequest, NextResponse } from "next/server";
import {
  isCustomerOnlyPath,
  isPortalHost,
  shouldBlockAdminOnHost,
  toInternalAdminPath,
  toPortalPath,
} from "@/lib/domains/host-routing";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|txt|xml)$).*)",
  ],
};

function rewrite(request: NextRequest, internalPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = internalPath;
  return NextResponse.rewrite(url);
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const pathname = request.nextUrl.pathname;

  // --- Admin portal host ---
  if (isPortalHost(host)) {
    if (pathname === "/sw.js" || pathname === "/manifest.webmanifest") {
      return new NextResponse(null, { status: 404 });
    }

    if (pathname.startsWith("/admin")) {
      const clean = toPortalPath(pathname);
      const target = request.nextUrl.clone();
      target.pathname = clean;
      return NextResponse.redirect(target);
    }

    if (pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    if (isCustomerOnlyPath(pathname)) {
      const target = request.nextUrl.clone();
      target.pathname = "/";
      return NextResponse.redirect(target);
    }

    return rewrite(request, toInternalAdminPath(pathname));
  }

  // --- Public production host: block /admin ---
  if (shouldBlockAdminOnHost(host) && pathname.startsWith("/admin")) {
    const target = request.nextUrl.clone();
    target.pathname = "/";
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}
