"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AdminSidebar, AdminMobileDrawer } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { AuthGuard } from "./auth-guard";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-cream dark:bg-[#120e0c]" data-admin>
        <AdminSidebar />
        <AdminMobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="lg:pl-64">
          <AdminHeader onMenuClick={() => setMobileOpen(true)} />
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </AuthGuard>
  );
}
