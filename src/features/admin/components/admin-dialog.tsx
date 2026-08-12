"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type AdminDialogSize = "sm" | "md" | "lg" | "xl" | "product";

/**
 * Explicit width via min() so the modal never collapses to a side strip.
 * Positioning comes from Dialog layout="center" (fixed + translate).
 */
const SIZE_CLASS: Record<AdminDialogSize, string> = {
  sm: "w-[min(520px,calc(100vw-1.5rem))] max-w-[min(520px,calc(100vw-1.5rem))]",
  md: "w-[min(680px,calc(100vw-1.5rem))] max-w-[min(680px,calc(100vw-1.5rem))]",
  lg: "w-[min(780px,calc(100vw-1.5rem))] max-w-[min(780px,calc(100vw-1.5rem))]",
  xl: "w-[min(900px,calc(100vw-1.5rem))] max-w-[min(900px,calc(100vw-1.5rem))]",
  product: "w-[min(900px,calc(100vw-1.5rem))] max-w-[min(900px,calc(100vw-1.5rem))]",
};

const AdminDialog = Dialog;
const AdminDialogTitle = DialogTitle;

const AdminDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent> & {
    size?: AdminDialogSize;
  }
>(({ className, size = "md", layout: _ignoredLayout, ...props }, ref) => {
  const { dir } = useLocale();

  return (
    <DialogContent
      ref={ref}
      dir={dir}
      className={cn(
        "max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden rounded-2xl border border-beige-dark/30 bg-warm-white p-0 sm:max-h-[min(85dvh,900px)]",
        SIZE_CLASS[size],
        dir === "rtl" && "[&>button]:left-4 [&>button]:right-auto [&>button]:end-auto",
        className
      )}
      {...props}
      layout="center"
    />
  );
});
AdminDialogContent.displayName = "AdminDialogContent";

function AdminDialogHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogHeader>) {
  return (
    <DialogHeader
      className={cn(
        "shrink-0 border-b border-beige-dark/20 bg-warm-white px-5 py-4 pe-12 text-start sm:px-6 dark:border-white/10 dark:bg-[#1a1412]",
        className
      )}
      {...props}
    />
  );
}

function AdminDialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 sm:px-6",
        className
      )}
      {...props}
    />
  );
}

function AdminDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-end gap-3 border-t border-beige-dark/20 bg-warm-white px-5 py-4 sm:px-6 dark:border-white/10 dark:bg-[#1a1412]",
        className
      )}
      {...props}
    />
  );
}

export {
  AdminDialog,
  AdminDialogBody,
  AdminDialogContent,
  AdminDialogFooter,
  AdminDialogHeader,
  AdminDialogTitle,
};
