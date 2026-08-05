"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Database, HardDrive, Shield, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  testFirebaseConnection,
  isConnectionHealthy,
  type ConnectionTestResult,
} from "@/services/connectionService";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { adminCard } from "./components/admin-styles";

function StatusRow({
  label,
  online,
  loading,
  onlineLabel,
  offlineLabel,
}: {
  label: string;
  online: boolean;
  loading: boolean;
  onlineLabel: string;
  offlineLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-beige-dark/20 bg-cream/50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-sm font-medium text-coffee dark:text-warm-white">{label}</span>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-turquoise" />
      ) : (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            online ? "bg-turquoise/15 text-turquoise" : "bg-beige text-coffee/70"
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-turquoise" : "bg-coffee/40")}
          />
          {online ? onlineLabel : offlineLabel}
        </span>
      )}
    </div>
  );
}

export function SystemStatusCard() {
  const t = useT();
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [loading, setLoading] = useState(true);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const testResult = await testFirebaseConnection();
      setResult(testResult);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const healthy = result ? isConnectionHealthy(result) : false;
  const firestoreOnline = !!(result?.categoryRead && result?.productRead && result?.writeTest);
  const authOnline = !!result?.authReady;
  const storageOnline = !!result?.storageReady;
  const firebaseOnline = !!(result?.envValid && result?.initialized);

  return (
    <div className={cn(adminCard, "space-y-4")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-dark-brown dark:text-warm-white">{t("admin.system.title")}</h2>
          <p className="text-xs text-coffee/50 dark:text-warm-white/50">{t("admin.system.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => void runCheck()} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t("admin.system.refresh")}
        </Button>
      </div>

      <div className="space-y-2">
        <StatusRow label={t("admin.system.firebase")} online={firebaseOnline} loading={loading} onlineLabel={t("admin.status.online")} offlineLabel={t("admin.status.offline")} />
        <StatusRow label={t("admin.system.firestore")} online={firestoreOnline} loading={loading} onlineLabel={t("admin.status.online")} offlineLabel={t("admin.status.offline")} />
        <StatusRow label={t("admin.system.storage")} online={storageOnline} loading={loading} onlineLabel={t("admin.status.online")} offlineLabel={t("admin.status.offline")} />
        <StatusRow label={t("admin.system.auth")} online={authOnline} loading={loading} onlineLabel={t("admin.status.online")} offlineLabel={t("admin.status.offline")} />
      </div>

      {!loading && result?.error && (
        <p className="rounded-xl border border-beige-dark/30 bg-beige/40 px-3 py-2 text-xs text-coffee dark:border-white/10 dark:bg-white/5">
          {result.error}
        </p>
      )}

      {!loading && (
        <p className="text-xs text-coffee/45 dark:text-warm-white/45">
          {t("admin.system.overall")}{" "}
          <span className={cn("font-semibold", healthy ? "text-turquoise" : "text-coffee")}>
            {healthy ? t("admin.system.allOk") : t("admin.system.issues")}
          </span>
        </p>
      )}

      <div className="flex gap-3 text-coffee/30 dark:text-warm-white/30">
        <Cloud className="h-4 w-4" />
        <Database className="h-4 w-4" />
        <HardDrive className="h-4 w-4" />
        <Shield className="h-4 w-4" />
      </div>
    </div>
  );
}
