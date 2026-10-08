"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Printer, Wifi, Scissors, Languages, ImageIcon } from "lucide-react";
import { useAuthFetch } from "@/lib/auth/auth-fetch";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { cn } from "@/lib/utils";

type StatusTone = "idle" | "ok" | "fail" | "info";

export function PrinterTestAdmin() {
  const t = useT();
  const authFetch = useAuthFetch();
  const [status, setStatus] = useState("Not tested");
  const [tone, setTone] = useState<StatusTone>("idle");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [ip, setIp] = useState("—");
  const [port, setPort] = useState("—");

  const run = useCallback(
    async (key: string, path: string, init?: RequestInit) => {
      setBusy(key);
      setDetail("");
      try {
        const res = await authFetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          ...init,
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok || data.success === false || data.connected === false) {
          setTone("fail");
          setStatus("Failed");
          setDetail(String(data.error ?? data.message ?? `HTTP ${res.status}`));
          return;
        }
        if (key === "status") {
          setTone("ok");
          setStatus("Connected");
          if (typeof data.ip === "string") setIp(data.ip);
          if (data.port != null) setPort(String(data.port));
          setDetail(`${data.ip}:${data.port}`);
          return;
        }
        setTone("ok");
        setStatus(
          key.startsWith("cutter")
            ? "Cutter sent"
            : key.includes("arabic")
              ? "Arabic sent — confirm paper"
              : key === "hebrew"
                ? "Hebrew sent — confirm paper"
                : "Print sent"
        );
        setDetail(String(data.message ?? "OK"));
      } catch (error) {
        setTone("fail");
        setStatus("Failed");
        setDetail(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(null);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void run("status", "/api/printer/status");
  }, [run]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.printerTest.title", "בדיקת מדפסת")}
        subtitle={t(
          "admin.printerTest.subtitle",
          "בדיקת רשת והדפסת TEST מקומית בלבד — ללא חיבור להזמנות"
        )}
      />

      <div className="rounded-2xl border border-beige-dark/20 bg-warm-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-coffee">
          <Printer className="h-5 w-5 text-turquoise" strokeWidth={1.75} />
          <h2 className="text-base font-semibold">HS-KH80ULAI</h2>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-coffee/50">Printer IP</dt>
            <dd className="font-mono font-medium text-dark-brown" dir="ltr">
              {ip}
            </dd>
          </div>
          <div>
            <dt className="text-coffee/50">Port</dt>
            <dd className="font-mono font-medium text-dark-brown" dir="ltr">
              {port}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-coffee/50">Status</dt>
            <dd
              className={cn(
                "mt-1 font-semibold",
                tone === "ok" && "text-turquoise",
                tone === "fail" && "text-red-600",
                tone === "info" && "text-amber-700",
                tone === "idle" && "text-coffee/60"
              )}
            >
              {status}
            </dd>
            {detail && (
              <p className="mt-1 text-xs text-coffee/55" dir="auto">
                {detail}
              </p>
            )}
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("status", "/api/printer/status")}
          >
            {busy === "status" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            {t("admin.printerTest.checkConnection", "בדוק חיבור")}
          </Button>
          <Button
            type="button"
            disabled={Boolean(busy)}
            onClick={() =>
              void run("ascii", "/api/printer/test", {
                body: JSON.stringify({ mode: "ascii" }),
              })
            }
          >
            {busy === "ascii" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {t("admin.printerTest.printTest", "הדפס TEST")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() =>
              void run("cutter", "/api/printer/test", {
                body: JSON.stringify({ mode: "cutter", cut: "full" }),
              })
            }
          >
            {busy === "cutter" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Scissors className="h-4 w-4" />
            )}
            {t("admin.printerTest.cutter", "בדיקת Cutter")} (GS V 0)
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() =>
              void run("cutter-partial", "/api/printer/test", {
                body: JSON.stringify({ mode: "cutter", cut: "partial" }),
              })
            }
          >
            {busy === "cutter-partial" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Scissors className="h-4 w-4" />
            )}
            Cutter GS V 1
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("hebrew", "/api/printer/test-hebrew")}
          >
            {busy === "hebrew" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Languages className="h-4 w-4" />
            )}
            {t("admin.printerTest.hebrew", "בדיקת עברית")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("arabic", "/api/printer/test-arabic")}
          >
            {busy === "arabic" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Languages className="h-4 w-4" />
            )}
            {t("admin.printerTest.arabic", "בדיקת ערבית")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() => void run("arabic-raster", "/api/printer/test-arabic-raster")}
          >
            {busy === "arabic-raster" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {t("admin.printerTest.arabicRaster", "ערבית Raster")}
          </Button>
        </div>

        <div className="mt-6 space-y-2 rounded-xl bg-cream/80 p-4 text-xs leading-relaxed text-coffee/65">
          <p>
            {t(
              "admin.printerTest.hintLocal",
              "המדפסת ברשת מקומית בלבד. הבדיקה חייבת לרוץ מ־localhost על מחשב באותה רשת — לא מ־Vercel."
            )}
          </p>
          <p dir="ltr" className="font-mono text-[11px]">
            npx tsx scripts/printer-phase-test.mts cutter
            <br />
            npx tsx scripts/printer-phase-test.mts hebrew
            <br />
            npx tsx scripts/printer-phase-test.mts arabic-raster
          </p>
          <p>
            {t(
              "admin.printerTest.hintOrders",
              "אין חיבור להזמנות ואין הדפסה אוטומטית בשלב זה."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
