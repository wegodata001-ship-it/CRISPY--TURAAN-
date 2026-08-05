"use client";

import type { LucideIcon } from "lucide-react";
import { adminCard } from "./admin-styles";
import { cn } from "@/lib/utils";

interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}

export function AdminEmptyState({ icon: Icon, title, hint, action, className }: AdminEmptyStateProps) {
  return (
    <div className={cn(adminCard, "flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-beige/50 dark:bg-white/5">
        <Icon className="h-6 w-6 text-coffee/40 dark:text-warm-white/40" />
      </div>
      <p className="text-sm font-medium text-dark-brown dark:text-warm-white">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-coffee/50 dark:text-warm-white/50">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
