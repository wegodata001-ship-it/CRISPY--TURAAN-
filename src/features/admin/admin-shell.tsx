"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { AdminSidebar, AdminMobileDrawer } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { AuthGuard } from "./auth-guard";
import { ADMIN_LAYOUT } from "./admin-layout-config";
import { isAdminLoginPath } from "@/lib/domains/host-routing";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLogin = isAdminLoginPath(pathname);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-cream dark:bg-[#120e0c]" data-admin>
        <AdminMobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <AdminSidebar />

        <div
          data-admin-content
          className={cn(
            "flex min-h-screen min-w-0 flex-col overflow-x-hidden",
            ADMIN_LAYOUT.contentOffset
          )}
        >
          <AdminHeader onMenuClick={() => setMobileOpen(true)} />
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8"
          >
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </motion.main>
        </div>
      </div>
    </AuthGuard>
  );
}
