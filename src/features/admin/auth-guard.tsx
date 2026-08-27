"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/brand/app-loading-screen";
import { isAdminLoginPath, safeAdminReturnPath } from "@/lib/domains/host-routing";
import { useAdminPath } from "@/hooks/useAdminPath";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const adminPath = useAdminPath();

  useEffect(() => {
    if (!loading && !user && !isAdminLoginPath(pathname)) {
      const login = adminPath("login");
      const returnTo = encodeURIComponent(safeAdminReturnPath(pathname, adminPath("")));
      router.replace(`${login}?returnTo=${returnTo}`);
    }
  }, [user, loading, pathname, router, adminPath]);

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!user) return null;

  return <>{children}</>;
}
