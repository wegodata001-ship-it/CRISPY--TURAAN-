"use client";

import { useCallback } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";

export default function OfflinePage() {
  const t = useT();

  const retry = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-cream px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-beige/60 text-coffee/50">
        <WifiOff className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold text-dark-brown">
        {t("pwa.offlineTitle", "אין כרגע חיבור לאינטרנט")}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-coffee/65">
        {t(
          "pwa.offlineHint",
          "בדקו את החיבור לרשת ונסו שוב. לא ניתן ליצור הזמנות ללא אינטרנט."
        )}
      </p>
      <Button variant="turquoise" size="lg" className="mt-8" onClick={retry}>
        <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
        {t("pwa.retry", "נסה שוב")}
      </Button>
    </div>
  );
}
