"use client";

import { useEffect } from "react";
import { AppLogo } from "@/components/brand/app-logo";
import { cn } from "@/lib/utils";

export function AppLoadingScreen({ className }: { className?: string }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-0 z-[90] flex min-h-[100dvh] w-full items-center justify-center bg-cream",
        className
      )}
    >
      <div className="flex flex-col items-center">
        <AppLogo
          size="xl"
          priority
          href={null}
          className="h-auto max-h-none w-[128px] sm:w-[164px]"
        />
        <span className="mt-6 h-6 w-6 animate-spin rounded-full border-2 border-beige-dark/35 border-t-turquoise" />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
