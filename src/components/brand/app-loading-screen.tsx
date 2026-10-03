"use client";

import { useEffect } from "react";
import { AppLogo } from "@/components/brand/app-logo";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function AppLoadingScreen({ className }: { className?: string }) {
  const t = useT();

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
      data-crispy-loader="true"
      className={cn(
        "fixed inset-0 z-[90] flex min-h-[100dvh] w-full items-center justify-center",
        className
      )}
      style={{ backgroundColor: "#FFF5E6" }}
    >
      <div className="flex flex-col items-center bg-transparent p-0 shadow-none">
        <AppLogo
          size="xl"
          priority
          href={null}
          pulse
          className="h-auto max-h-none w-[132px] bg-transparent sm:w-[168px]"
        />
        <p className="mt-5 text-sm font-semibold text-dark-brown">{t("common.loading")}</p>
        <div className="mt-3 flex items-center gap-2" aria-hidden>
          <span className="crispy-loader-dot bg-[#D71920]" />
          <span className="crispy-loader-dot crispy-loader-dot-delay bg-[#F6B800]" />
          <span className="crispy-loader-dot crispy-loader-dot-delay-2 bg-[#D71920]" />
        </div>
      </div>
    </div>
  );
}
