"use client";

import { useEffect, useState } from "react";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/providers/locale-provider";
import { subscribeToSettings, updateSettings } from "@/services/settingsService";
import { DEFAULT_PAUSE_REASON } from "@/lib/store-pause";
import { AdminCard } from "./components/admin-card";
import { adminInput } from "./components/admin-styles";

export function OrderingPausePanel() {
  const t = useT();
  const [paused, setPaused] = useState(false);
  const [reason, setReason] = useState(DEFAULT_PAUSE_REASON);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeToSettings((settings) => {
      setPaused(settings.orderingPaused);
      setReason(settings.orderingPauseReason || DEFAULT_PAUSE_REASON);
      setReady(true);
    }, () => setReady(true));
  }, []);

  const save = async (nextPaused: boolean) => {
    setSaving(true);
    setError("");
    const result = await updateSettings({
      orderingPaused: nextPaused,
      orderingPauseReason: reason.trim() || DEFAULT_PAUSE_REASON,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setPaused(result.data.orderingPaused);
    setReason(result.data.orderingPauseReason || DEFAULT_PAUSE_REASON);
  };

  return (
    <AdminCard
      title={t("admin.pause.title")}
      icon={
        paused ? (
          <PauseCircle className="h-4 w-4 text-[#D71920]" />
        ) : (
          <PlayCircle className="h-4 w-4 text-emerald-600" />
        )
      }
    >
      <p className="text-sm text-coffee/70">{t("admin.pause.hint")}</p>
      <p
        className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          paused ? "bg-[#D71920]/10 text-[#A90F16]" : "bg-emerald-500/10 text-emerald-700"
        }`}
      >
        {paused ? t("admin.pause.paused") : t("admin.pause.open")}
      </p>
      <div className="mt-4">
        <Label htmlFor="ordering-pause-reason">{t("admin.pause.reason")}</Label>
        <Textarea
          id="ordering-pause-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("admin.pause.reasonPlaceholder")}
          className={`mt-1 min-h-20 rounded-xl ${adminInput}`}
          disabled={!ready || saving}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {paused ? (
          <Button
            type="button"
            onClick={() => save(false)}
            disabled={!ready || saving}
            className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {t("admin.pause.resume")}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => save(true)}
            disabled={!ready || saving}
            className="h-10 rounded-xl bg-[#D71920] hover:bg-[#A90F16]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
            {t("admin.pause.pause")}
          </Button>
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-[#A90F16]">{error}</p> : null}
    </AdminCard>
  );
}
