"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useHostSurface } from "@/components/providers/host-surface-provider";
import { useSettings } from "@/hooks/useSettings";
import { PAUSE_COPY } from "@/lib/store-pause";
import { useLocale } from "@/components/providers/locale-provider";
import { StorePauseScreen } from "./store-pause-screen";

export function StorePauseGate({ children }: { children: ReactNode }) {
  const surface = useHostSurface();
  const pathname = usePathname() || "/";
  const { locale } = useLocale();
  const { settings, loading } = useSettings();
  const paused = settings?.orderingPaused === true;
  const isAdmin = surface === "portal" || pathname.startsWith("/admin");

  if (!isAdmin && surface !== "menu" && loading) {
    return <div className="min-h-dvh bg-[#FFF4E2]" />;
  }

  if (!paused || isAdmin) return children;

  if (surface === "menu") {
    const copy = PAUSE_COPY[locale] ?? PAUSE_COPY.ar;
    return (
      <>
        <div className="bg-[#171717] px-4 py-3 text-center text-sm text-[#FFF4E2]">
          <p className="font-semibold">{copy.title}</p>
          {settings?.orderingPauseReason ? <p className="mt-1 text-[#F6B800]">{settings.orderingPauseReason}</p> : null}
        </div>
        {children}
      </>
    );
  }

  return <StorePauseScreen reason={settings?.orderingPauseReason} />;
}
