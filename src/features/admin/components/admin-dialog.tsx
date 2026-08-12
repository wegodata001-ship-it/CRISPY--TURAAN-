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

type AdminDialogSize = "sm" | "md" | "lg" | "product";

const SIZE_CLASS: Record<AdminDialogSize, string> = {
  sm: "sm:max-w-[520px]",
  md: "sm:max-w-[680px]",
  lg: "sm:max-w-[780px]",
  product: "sm:max-w-[900px]",
};

const AdminDialog = Dialog;
const AdminDialogTitle = DialogTitle;

const AdminDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent> & {
    size?: AdminDialogSize;
  }
>(({ className, size = "md", ...props }, ref) => {
  const { dir } = useLocale();

  return (
    <DialogContent
      ref={ref}
      dir={dir}
      overlayClassName="z-[9998] h-[100dvh] w-screen"
      className={cn(
        "z-[9999] flex max-h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border border-beige-dark/30 bg-warm-white p-0 sm:max-h-[calc(100dvh-32px)] sm:w-[calc(100vw-32px)]",
        SIZE_CLASS[size],
        dir === "rtl" && "[&>button]:left-4 [&>button]:right-auto",
        className
      )}
      {...props}
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
        "shrink-0 border-b border-beige-dark/20 px-5 py-4 pe-12 text-start sm:px-6 dark:border-white/10",
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
      className={cn("min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-6", className)}
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
