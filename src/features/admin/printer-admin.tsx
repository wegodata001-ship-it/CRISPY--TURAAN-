"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuthFetch } from "@/lib/auth/auth-fetch";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { cn } from "@/lib/utils";
import type { PrintJob, PrintLocale } from "@/lib/print-jobs/types";

type StatusPayload = {
  ok?: boolean;
  error?: string;
  printer?: { name: string; id?: string; ip: string | null; port: number | null; connection?: string };
  agent?: {
    online: boolean;
    status: string;
    lastSeenAt: string | null;
    hostname: string | null;
    version: string | null;
    printerConnectionStatus: string;
    ethernetAvailable?: boolean | null;
    ethernetIp?: string | null;
    wifiSameSubnet?: boolean | null;
    printerMac?: string | null;
    tcp9100?: string | null;
    routeConflict?: boolean | null;
    networkWarning?: string | null;
    platform?: "ANDROID" | "WINDOWS" | null;
  };
  signals?: {
    agentOffline?: boolean;
    printerConnectionFailed?: boolean;
    printJobFailed?: boolean;
  };
  lastSuccessfulPrintAt?: string | null;
  counts?: { pending: number; printing: number; printed: number; sent?: number; failed: number; dismissed?: number };
  autoPrintNewOrders?: boolean;
  jobs?: PrintJob[];
};

function formatStamp(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function PrinterAdmin() {
  const t = useT();
  const authFetch = useAuthFetch();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [errorJobId, setErrorJobId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await authFetch("/api/admin/printer/status");
      const json = (await res.json()) as StatusPayload;
      if (!res.ok || json.ok === false) {
        setError(json.error || `HTTP ${res.status}`);
        return;
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  const run = useCallback(
    async (key: string, path: string, body?: unknown) => {
      setBusy(key);
      setNotice("");
      setError("");
      try {
        const res = await authFetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : "{}",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          message?: string;
          jobId?: string;
        };
        if (!res.ok || json.ok === false) {
          setError(json.error || `HTTP ${res.status}`);
          return;
        }
        setNotice(json.message || json.jobId || "OK");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [authFetch, load]
  );

  const online = Boolean(data?.agent?.online);
  const printerConnected = data?.agent?.printerConnectionStatus === "connected";
  const ip = data?.printer?.ip || "—";
  const port = data?.printer?.port ?? "—";
  const connection = data?.printer?.connection || "TCP / LAN";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.printer.title", "מדפסת מטבח")}
        subtitle={t(
          "admin.printer.subtitle",
          "הדפסה דרך סוכן מקומי במחשב המסעדה — לא ישירות מהענן"
        )}
        actions={
          <Button type="button" variant="outline" onClick={() => void load()} disabled={Boolean(busy)}>
            <RefreshCw className="h-4 w-4" />
            {t("admin.printer.refresh", "רענון")}
          </Button>
        }
      />

      <div className="rounded-2xl border border-beige-dark/20 bg-warm-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-coffee">
          <Printer className="h-5 w-5 text-turquoise" strokeWidth={1.75} />
          <h2 className="text-base font-semibold">
            {data?.printer?.name || t("admin.printer.name", "CRISPY MAIN")}
          </h2>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-coffee/50">{t("admin.printer.ip", "IP")}</dt>
            <dd className="font-mono font-medium text-dark-brown" dir="ltr">
              {ip}
            </dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.port", "Port")}</dt>
            <dd className="font-mono font-medium text-dark-brown" dir="ltr">
              {port}
            </dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.connection", "Connection")}</dt>
            <dd className="font-medium text-dark-brown" dir="ltr">
              {connection}
            </dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.tcp", "TCP 9100")}</dt>
            <dd
              className={cn(
                "mt-1 inline-flex items-center gap-1.5 font-semibold",
                printerConnected ? "text-turquoise" : "text-red-600"
              )}
            >
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-full",
                  printerConnected ? "bg-turquoise" : "bg-red-500"
                )}
              />
              {data?.agent?.tcp9100 === "PASS"
                ? t("admin.printer.tcpPass", "PASS")
                : data?.agent?.tcp9100 === "FAIL"
                  ? t("admin.printer.tcpFail", "FAIL")
                  : t("admin.printer.tcpUnknown", "UNKNOWN")}
            </dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.agent", "Local Agent")}</dt>
            <dd
              className={cn(
                "mt-1 inline-flex items-center gap-1.5 font-semibold",
                online ? "text-turquoise" : "text-red-600"
              )}
            >
              {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {online
                ? t("admin.printer.online", "Online")
                : t("admin.printer.offline", "Offline")}
            </dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.lastHeartbeat", "Last heartbeat")}</dt>
            <dd className="text-dark-brown">{formatStamp(data?.agent?.lastSeenAt)}</dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.lastPrint", "Last successful print")}</dt>
            <dd className="text-dark-brown">{formatStamp(data?.lastSuccessfulPrintAt)}</dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.autoPrint", "New order auto print")}</dt>
            <dd className="font-medium text-dark-brown">
              {data?.autoPrintNewOrders
                ? t("admin.printer.autoOn", "ON")
                : t("admin.printer.autoOff", "OFF")}
            </dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.pending", "Pending jobs")}</dt>
            <dd className="font-medium text-dark-brown">{data?.counts?.pending ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.failed", "Failed jobs")}</dt>
            <dd className="font-medium text-dark-brown">{data?.counts?.failed ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.dismissed", "לא רלוונטי")}</dt>
            <dd className="font-medium text-dark-brown">{data?.counts?.dismissed ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.hostname", "Agent host")}</dt>
            <dd className="text-dark-brown" dir="ltr">
              {data?.agent?.hostname || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.ethernet", "Ethernet")}</dt>
            <dd className="font-medium text-dark-brown" dir="ltr">
              {data?.agent?.ethernetAvailable == null
                ? "—"
                : data.agent.ethernetAvailable
                  ? `YES ${data.agent.ethernetIp || ""}`.trim()
                  : "NO"}
            </dd>
          </div>
          <div>
            <dt className="text-coffee/50">{t("admin.printer.mac", "Printer MAC")}</dt>
            <dd className="font-mono text-dark-brown" dir="ltr">
              {data?.agent?.printerMac || "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div
            className={cn(
              "rounded-xl border px-3 py-2 font-semibold",
              data?.signals?.agentOffline ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
            )}
          >
            {data?.signals?.agentOffline
              ? data?.agent?.platform === "ANDROID"
                ? t("admin.printer.androidOffline", "CRISPY Android Agent OFFLINE")
                : t("admin.printer.agentOffline", "AGENT OFFLINE")
              : data?.agent?.platform === "ANDROID"
                ? t("admin.printer.androidOnline", "CRISPY Android Agent ONLINE")
                : t("admin.printer.agentOnline", "AGENT ONLINE")}
          </div>
          <div
            className={cn(
              "rounded-xl border px-3 py-2 font-semibold",
              data?.signals?.printerConnectionFailed
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-beige-dark/20 bg-beige/40 text-dark-brown"
            )}
          >
            {data?.signals?.printerConnectionFailed
              ? t("admin.printer.printerFailed", "PRINTER CONNECTION FAILED")
              : t("admin.printer.printerOk", "PRINTER TCP")}
          </div>
          <div
            className={cn(
              "rounded-xl border px-3 py-2 font-semibold",
              data?.signals?.printJobFailed
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-beige-dark/20 bg-beige/40 text-dark-brown"
            )}
          >
            {data?.signals?.printJobFailed
              ? t("admin.printer.jobFailed", "PRINT JOB FAILED")
              : t("admin.printer.jobOk", "NO FAILED JOBS")}
          </div>
        </div>
        {data?.agent?.networkWarning && (
          <p className="mt-3 text-sm font-medium text-amber-800">{data.agent.networkWarning}</p>
        )}
        <p className="mt-2 text-xs text-coffee/55">
          {t(
            "admin.printer.sentNotPaper",
            "SENT = הבתים נשלחו למדפסת. זה לא אימות שנייר יצא. PRINTED נשמר רק אחרי אישור פיזי."
          )}
        </p>

        {(error || notice) && (
          <p className={cn("mt-4 text-sm", error ? "text-red-600" : "text-turquoise")}>
            {error || notice}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void run("test-ar", "/api/admin/printer/test-print", { locale: "ar" })}
          >
            {busy === "test-ar" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {t("admin.printer.testPrint", "הדפסת בדיקה")}
          </Button>
          {(["he", "en"] as PrintLocale[]).map((locale) => (
            <Button
              key={locale}
              type="button"
              variant="outline"
              disabled={Boolean(busy)}
              onClick={() => void run(`test-${locale}`, "/api/admin/printer/test-print", { locale })}
            >
              {busy === `test-${locale}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {t("admin.printer.testPrint", "הדפסת בדיקה")} ({locale.toUpperCase()})
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => {
              setNotice(
                t(
                  "admin.printer.savedHint",
                  "הכתובת נשמרת ב-PRINTER_IP של הסוכן המקומי. אין לשנות אותה ב-Vercel."
                )
              );
            }}
          >
            {t("admin.printer.save", "שמור")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("retry", "/api/admin/printer/retry-failed")}
          >
            {busy === "retry" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {t("admin.printer.retryFailed", "נסה שוב")}
          </Button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-coffee/60">
          {t(
            "admin.printer.hintAgent",
            "הדפסה רק דרך C:\\CRISPY-PRINTER על מחשב המסעדה. Vercel לא פותח TCP לרשת המקומית."
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-beige-dark/20 bg-warm-white p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold text-coffee">
          {t("admin.printer.recentJobs", "עבודות הדפסה אחרונות")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="text-xs uppercase tracking-wide text-coffee/45">
              <tr>
                <th className="pb-2 pe-3 font-medium">{t("admin.printer.colType", "Type")}</th>
                <th className="pb-2 pe-3 font-medium">{t("admin.printer.colStatus", "Status")}</th>
                <th className="pb-2 pe-3 font-medium">{t("admin.printer.colOrder", "Order")}</th>
                <th className="pb-2 pe-3 font-medium">{t("admin.printer.colAttempts", "Attempts")}</th>
                <th className="pb-2 pe-3 font-medium">{t("admin.printer.colCreated", "Created")}</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(data?.jobs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-coffee/50">
                    {t("admin.printer.noJobs", "אין עבודות הדפסה עדיין")}
                  </td>
                </tr>
              ) : (
                (data?.jobs ?? []).map((job) => (
                  <tr key={job.id} className="border-t border-beige-dark/15">
                    <td className="py-2 pe-3 font-medium">{job.type}</td>
                    <td className="py-2 pe-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          job.status === "PRINTED" && "bg-emerald-50 text-emerald-700",
                          job.status === "SENT" && "bg-emerald-50 text-emerald-700",
                          job.status === "PENDING" && "bg-amber-50 text-amber-800",
                          job.status === "PRINTING" && "bg-sky-50 text-sky-800",
                          job.status === "FAILED" && "bg-red-50 text-red-700",
                          job.status === "DISMISSED" && "bg-stone-100 text-stone-700"
                        )}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2 pe-3 font-mono text-xs" dir="ltr">
                      {job.orderId || "TEST"}
                    </td>
                    <td className="py-2 pe-3">{job.attempts}</td>
                    <td className="py-2 pe-3 text-xs text-coffee/60">{formatStamp(job.createdAt)}</td>
                    <td className="py-2 text-end">
                      {job.status === "PENDING" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void run(`dismiss-${job.id}`, "/api/admin/printer/dismiss-job", {
                              jobId: job.id,
                            })
                          }
                        >
                          {t("admin.printer.dismiss", "לא רלוונטי")}
                        </Button>
                      )}
                      {(job.status === "DISMISSED" || job.autoPrintHeld) && job.status !== "PRINTED" && job.status !== "PRINTING" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void run(`approve-${job.id}`, "/api/admin/printer/approve-job", {
                              jobId: job.id,
                            })
                          }
                        >
                          {t("admin.printer.approve", "אשר להדפסה")}
                        </Button>
                      )}
                      {job.status === "FAILED" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void run(`retry-${job.id}`, "/api/admin/printer/retry-failed", {
                              jobId: job.id,
                            })
                          }
                        >
                          {t("admin.printer.retry", "נסה שוב")}
                        </Button>
                      )}
                      {job.orderId && job.type !== "TEST" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void run(`reprint-${job.id}`, "/api/admin/printer/reprint", {
                              orderId: job.orderId,
                              locale: job.locale,
                            })
                          }
                        >
                          {t("admin.printer.reprint", "הדפס מחדש")}
                        </Button>
                      )}
                      {(job.lastError || job.cutterError) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setErrorJobId(errorJobId === job.id ? null : job.id)}
                        >
                          {t("admin.printer.viewError", "צפה בשגיאה")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {errorJobId && (
          <p className="mt-3 text-sm text-red-700">
            {(data?.jobs ?? []).find((job) => job.id === errorJobId)?.lastError ||
              (data?.jobs ?? []).find((job) => job.id === errorJobId)?.cutterError ||
              t("admin.printer.noErrorDetail", "אין פירוט שגיאה")}
          </p>
        )}
      </div>
    </div>
  );
}
