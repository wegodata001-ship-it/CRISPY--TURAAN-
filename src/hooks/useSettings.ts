"use client";

import { useEffect, useState } from "react";
import { subscribeToSettings, type AppSettings } from "@/services/settingsService";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToSettings(
      (data) => {
        setSettings(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  return { settings, loading };
}
