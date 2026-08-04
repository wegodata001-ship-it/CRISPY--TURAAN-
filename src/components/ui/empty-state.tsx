"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyStateBackground } from "@/components/brand/store-image";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("relative overflow-hidden rounded-3xl", className)}
    >
      <EmptyStateBackground className="min-h-[280px]">
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-turquoise/15 text-turquoise">
            <Icon className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <h3 className="mt-5 font-display text-xl font-bold text-dark-brown">{title}</h3>
          {description && (
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-coffee/60">{description}</p>
          )}
          {actionLabel && actionHref && (
            <Button asChild variant="turquoise" className="mt-6">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          )}
          {actionLabel && onAction && !actionHref && (
            <Button variant="turquoise" className="mt-6" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      </EmptyStateBackground>
    </motion.div>
  );
}
