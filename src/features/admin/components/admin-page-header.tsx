"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { adminPageSubtitle, adminPageTitle } from "./admin-styles";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="min-w-0">
        <h1 className={adminPageTitle}>{title}</h1>
        {subtitle && <p className={adminPageSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
