"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminKpiCard } from "./admin-styles";
import { cn } from "@/lib/utils";

interface AdminKpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass?: string;
  bgClass?: string;
  loading?: boolean;
  index?: number;
}

export function AdminKpiCard({
  label,
  value,
  icon: Icon,
  colorClass = "text-turquoise",
  bgClass = "bg-turquoise/10",
  loading,
  index = 0,
}: AdminKpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={adminKpiCard}
    >
      {loading ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : (
        <>
          <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl", bgClass)}>
            <Icon className={cn("h-4 w-4", colorClass)} />
          </div>
          <p className={cn("text-xl font-bold md:text-2xl", colorClass)}>{value}</p>
          <p className="mt-1 text-xs text-coffee/55 dark:text-warm-white/55">{label}</p>
        </>
      )}
    </motion.div>
  );
}
