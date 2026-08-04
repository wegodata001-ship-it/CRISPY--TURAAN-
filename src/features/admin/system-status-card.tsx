"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Database, HardDrive, Shield, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  testFirebaseConnection,
  isConnectionHealthy,
  type ConnectionTestResult,
} from "@/services/connectionService";
import { cn } from "@/lib/utils";

function StatusRow({
  label,
  online,
  loading,
}: {
  label: string;
  online: boolean;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-beige-dark/20 bg-cream/50 px-4 py-3">
      <span className="text-sm font-medium text-coffee">{label}</span>
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
          {online ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
}

export function SystemStatusCard() {
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
    <div className="space-y-4 rounded-2xl bg-warm-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-dark-brown">System Status</h2>
          <p className="text-xs text-coffee/50">Firebase services health check</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void runCheck()} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        <StatusRow label="Firebase" online={firebaseOnline} loading={loading} />
        <StatusRow label="Firestore" online={firestoreOnline} loading={loading} />
        <StatusRow label="Storage" online={storageOnline} loading={loading} />
        <StatusRow label="Authentication" online={authOnline} loading={loading} />
      </div>

      {!loading && result?.error && (
        <p className="rounded-xl border border-beige-dark/30 bg-beige/40 px-3 py-2 text-xs text-coffee">
          {result.error}
        </p>
      )}

      {!loading && (
        <p className="text-xs text-coffee/45">
          Overall:{" "}
          <span className={cn("font-semibold", healthy ? "text-turquoise" : "text-coffee")}>
            {healthy ? "All systems operational" : "Issues detected"}
          </span>
        </p>
      )}

      <div className="flex gap-3 text-coffee/30">
        <Cloud className="h-4 w-4" />
        <Database className="h-4 w-4" />
        <HardDrive className="h-4 w-4" />
        <Shield className="h-4 w-4" />
      </div>
    </div>
  );
}
