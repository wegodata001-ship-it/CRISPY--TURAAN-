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
 * Width tokens — positioning is ALWAYS viewport-centered via Dialog layout="center"
 * (fixed flex shell). Never rely on translate or page-relative absolute.
 */
const SIZE_CLASS: Record<AdminDialogSize, string> = {
  sm: "w-[min(520px,calc(100vw-24px))] max-w-[min(520px,calc(100vw-24px))]",
  md: "w-[min(680px,calc(100vw-48px))] max-w-[min(680px,calc(100vw-48px))]",
  lg: "w-[min(820px,calc(100vw-48px))] max-w-[min(820px,calc(100vw-48px))]",
  xl: "w-[min(900px,calc(100vw-48px))] max-w-[min(900px,calc(100vw-48px))]",
  product: "w-[min(900px,calc(100vw-48px))] max-w-[min(900px,calc(100vw-48px))]",
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
        // Opaque white panel — overflow hidden; ONLY AdminDialogBody scrolls
        "flex max-h-[calc(100dvh-48px)] flex-col gap-0 overflow-hidden rounded-[20px] border border-black/[0.06] bg-white p-0 opacity-100 shadow-elevated",
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
        "shrink-0 border-b border-beige-dark/20 bg-white px-5 py-4 pe-12 text-start sm:px-6 dark:border-white/10 dark:bg-[#1a1412]",
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
        "flex shrink-0 items-center justify-end gap-3 border-t border-beige-dark/20 bg-white px-5 py-4 sm:px-6 dark:border-white/10 dark:bg-[#1a1412]",
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
