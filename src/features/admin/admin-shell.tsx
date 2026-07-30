"use client";

import { AdminSidebar, AdminMobileNav } from "./admin-sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream" data-admin>
      <AdminSidebar />
      <AdminMobileNav />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
