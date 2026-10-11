"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { useAuthFetch } from "@/lib/auth/auth-fetch";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { cn } from "@/lib/utils";

type ReleasePayload = {
  versionCode?: number;
  versionName?: string;
  required?: boolean;
  apkUrl?: string | null;
  sha256?: string;
  releaseNotes?: string;
  releasedAt?: string;
  available?: boolean;
  error?: string;
};

type AgentPayload = {
  ok?: boolean;
  error?: string;
  printer?: { ip: string | null; port: number | null };
  agent?: {
    online?: boolean;
    lastSeenAt?: string | null;
    printerIp?: string | null;
    printerPort?: number | null;
    appVersionName?: string | null;
    appVersionCode?: number | null;
    version?: string | null;
    platform?: string | null;
  };
};

function formatStamp(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function PrinterAppAdmin() {
  const t = useT();
  const authFetch = useAuthFetch();
  const [release, setRelease] = useState<ReleasePayload | null>(null);
  const [agent, setAgent] = useState<AgentPayload | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [releaseRes, statusRes] = await Promise.all([
        fetch("/api/android-app/latest", { cache: "no-store" }),
        authFetch("/api/admin/printer/status"),
      ]);
      const releaseJson = (await releaseRes.json()) as ReleasePayload;
      const statusJson = (await statusRes.json()) as AgentPayload;
      if (!releaseRes.ok) {
        setRelease(null);
        setError(releaseJson.error || `HTTP ${releaseRes.status}`);
      } else {
        setRelease(releaseJson);
      }
      if (!statusRes.ok || statusJson.ok === false) {
        setError(statusJson.error || `HTTP ${statusRes.status}`);
      } else {
        setAgent(statusJson);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const online = Boolean(agent?.agent?.online);
  const agentVersion = agent?.agent?.appVersionName || agent?.agent?.version || "—";
  const printerIp = agent?.agent?.printerIp || agent?.printer?.ip || "—";
  const printerPort = agent?.agent?.printerPort || agent?.printer?.port || "—";
  const apkReady = Boolean(release?.available && release.apkUrl);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.printerApp.title", "אפליקציית מדפסת")}
        subtitle={t(
          "admin.printerApp.subtitle",
          "גרסת האפליקציה המאושרת לטאבלט המסעדה"
        )}
        actions={
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            {t("admin.printer.refresh", "רענון")}
          </Button>
        }
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <dl className="grid gap-4 rounded-2xl border border-beige-dark/20 bg-warm-white p-5 text-sm shadow-soft sm:grid-cols-2">
        <div>
          <dt className="text-coffee/50">{t("admin.printerApp.productionVersion", "גרסת ייצור נוכחית")}</dt>
          <dd className="font-medium text-dark-brown" dir="ltr">
            {release?.versionName || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-coffee/50">{t("admin.printerApp.latestApk", "גרסת APK אחרונה")}</dt>
          <dd className="font-medium text-dark-brown" dir="ltr">
            {release?.versionName || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-coffee/50">versionCode</dt>
          <dd className="font-mono font-medium text-dark-brown" dir="ltr">
            {release?.versionCode ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-coffee/50">{t("admin.printerApp.releasedAt", "תאריך שחרור")}</dt>
          <dd className="text-dark-brown">{formatStamp(release?.releasedAt)}</dd>
        </div>
        <div>
          <dt className="text-coffee/50">{t("admin.printerApp.availability", "זמינות APK")}</dt>
          <dd className={cn("font-semibold", apkReady ? "text-turquoise" : "text-red-600")}>
            {apkReady
              ? t("admin.printerApp.available", "זמין")
              : t("admin.printerApp.unavailable", "לא זמין")}
          </dd>
        </div>
        <div>
          <dt className="text-coffee/50">{t("admin.printerApp.agentVersion", "גרסת הסוכן המחובר")}</dt>
          <dd className="font-medium text-dark-brown" dir="ltr">
            {agentVersion}
            {agent?.agent?.appVersionCode != null ? ` (${agent.agent.appVersionCode})` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-coffee/50">{t("admin.printer.lastHeartbeat", "Last heartbeat")}</dt>
          <dd className="text-dark-brown">{formatStamp(agent?.agent?.lastSeenAt)}</dd>
        </div>
        <div>
          <dt className="text-coffee/50">{t("admin.printer.ip", "IP")}</dt>
          <dd className="font-mono font-medium text-dark-brown" dir="ltr">
            {printerIp}:{printerPort}
          </dd>
        </div>
        <div>
          <dt className="text-coffee/50">{t("admin.printer.agent", "Agent")}</dt>
          <dd className={cn("font-semibold", online ? "text-turquoise" : "text-red-600")}>
            {online ? "ONLINE" : "OFFLINE"}
          </dd>
        </div>
        <div>
          <dt className="text-coffee/50">SHA-256</dt>
          <dd className="break-all font-mono text-xs text-dark-brown" dir="ltr">
            {release?.sha256 || "—"}
          </dd>
        </div>
      </dl>

      {release?.releaseNotes ? (
        <p className="text-sm text-coffee/70">{release.releaseNotes}</p>
      ) : null}

      {apkReady ? (
        <Button asChild className="rounded-xl">
          <a href={release?.apkUrl || "#"} download="CRISPY-Printer.apk">
            {agent === null && release === null ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("admin.printerApp.download", "הורדת אפליקציית CRISPY")}
          </a>
        </Button>
      ) : (
        <p className="text-sm text-coffee/60">
          {t("admin.printerApp.noApk", "אין APK מאושר להורדה.")}
        </p>
      )}
    </div>
  );
}
