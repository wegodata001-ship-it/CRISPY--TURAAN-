"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Ticket } from "lucide-react";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthFetch } from "@/lib/auth/auth-fetch";
import { useT } from "@/components/providers/locale-provider";
import { adminPathFromHost } from "@/lib/domains/host-routing";
import { couponStatus, remainingRedemptions, type CouponSnapshot } from "@/lib/coupons/engine";
import { formatPrice } from "@/lib/utils";

type CouponRow = CouponSnapshot & {
  id: string;
  campaignName: string;
  createdAt: string | null;
};

type RedemptionRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  redeemedAt: string;
  status: string;
  orderStatus: string;
  couponCode: string;
};

const STATUS_LABEL: Record<string, string> = {
  active: "פעיל / نشط",
  inactive: "לא פעיל / غير نشط",
  used: "נוצל / مستخدم",
  expired: "פג תוקף / منتهي",
  scheduled: "מתוזמן / مجدول",
};

function moneyDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function CouponsAdmin() {
  const t = useT();
  const authFetch = useAuthFetch();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [discountGiven, setDiscountGiven] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [history, setHistory] = useState<CouponRow | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await authFetch("/api/admin/coupons");
    const payload = (await response.json().catch(() => null)) as {
      coupons?: CouponRow[];
      discountGiven?: number;
      error?: string;
    } | null;
    if (!response.ok || !payload?.coupons) {
      setError(payload?.error || "לא ניתן לטעון קופונים");
      setLoading(false);
      return;
    }
    setCoupons(payload.coupons);
    setDiscountGiven(Number(payload.discountGiven) || 0);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const now = new Date();
    const needle = query.trim().toUpperCase();
    return coupons.filter((coupon) => {
      const status = couponStatus(coupon, now);
      if (needle && !coupon.code.includes(needle) && !coupon.campaignName.toUpperCase().includes(needle)) {
        return false;
      }
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (dateFilter) {
        const start = coupon.startsAt?.slice(0, 10);
        const end = coupon.expiresAt?.slice(0, 10);
        if (start && dateFilter < start) return false;
        if (end && dateFilter > end) return false;
      }
      return true;
    });
  }, [coupons, dateFilter, query, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: coupons.length,
      active: coupons.filter((coupon) => couponStatus(coupon, now) === "active").length,
      used: coupons.filter((coupon) => couponStatus(coupon, now) === "used").length,
      redemptions: coupons.reduce((sum, coupon) => sum + coupon.usedCount, 0),
    };
  }, [coupons]);

  const openHistory = async (coupon: CouponRow) => {
    setHistory(coupon);
    setHistoryLoading(true);
    setRedemptions([]);
    const response = await authFetch(`/api/admin/coupons/${encodeURIComponent(coupon.code)}/redemptions`);
    const payload = (await response.json().catch(() => null)) as { redemptions?: RedemptionRow[] } | null;
    setRedemptions(payload?.redemptions || []);
    setHistoryLoading(false);
  };

  const disable = async (coupon: CouponRow) => {
    await authFetch(`/api/admin/coupons/${encodeURIComponent(coupon.code)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    await load();
  };

  const orderHref = (orderNumber: string) => {
    const host = typeof window === "undefined" ? "" : window.location.hostname;
    return `${adminPathFromHost("orders", host)}?order=${encodeURIComponent(orderNumber)}`;
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.nav.coupons", "إدارة الكوبونات – ניהול קופונים")}
        subtitle="CRISPY7"
        actions={
          <Button
            className="rounded-xl bg-[#D71920] text-white hover:bg-[#A90F16]"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            + إنشاء كوبون
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["סך הקופונים", stats.total],
          ["פעילים", stats.active],
          ["נוצלו במלואם", stats.used],
          ["מימושים", stats.redemptions],
          ["הנחות שניתנו", formatPrice(discountGiven)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[#E7D7C3] bg-white p-4">
            <p className="text-xs text-[#70665D]">{label}</p>
            <p className="mt-1 text-2xl font-bold text-[#171717]">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש קוד"
          className="max-w-xs"
          dir="ltr"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-xl border border-[#E7D7C3] bg-white px-3 text-sm"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="inactive">לא פעיל</option>
          <option value="used">נוצל</option>
          <option value="expired">פג תוקף</option>
          <option value="scheduled">מתוזמן</option>
        </select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="max-w-[180px]"
        />
      </div>

      {error ? <p className="text-sm text-[#A90F16]">{error}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#70665D]">
          <Loader2 className="h-4 w-4 animate-spin" /> טוען קופונים
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E7D7C3] bg-white">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-[#FFF4E2] text-start">
              <tr>
                {["קוד", "סוג", "ערך", "מגבלה", "בפועל", "נותרו", "תוקף", "סטטוס", "פעולות"].map((head) => (
                  <th key={head} className="px-3 py-3 text-start font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((coupon) => {
                const status = couponStatus(coupon, new Date());
                const left = remainingRedemptions(coupon);
                return (
                  <tr key={coupon.id} className="border-t border-[#F3E6D6]">
                    <td className="px-3 py-3 font-semibold" dir="ltr">{coupon.code}</td>
                    <td className="px-3 py-3">{coupon.discountType === "percent" ? "אחוז" : "סכום"}</td>
                    <td className="px-3 py-3">{coupon.discountType === "percent" ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue)}</td>
                    <td className="px-3 py-3">{coupon.maxRedemptions == null ? "ללא הגבלה" : coupon.maxRedemptions}</td>
                    <td className="px-3 py-3">{coupon.usedCount}</td>
                    <td className="px-3 py-3">{left == null ? "∞" : left}</td>
                    <td className="px-3 py-3 text-xs">
                      {moneyDate(coupon.startsAt)}
                      <br />
                      {coupon.expiresAt ? moneyDate(coupon.expiresAt) : "ללא תפוגה"}
                    </td>
                    <td className="px-3 py-3">{STATUS_LABEL[status]}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="text-xs font-semibold text-[#171717]" onClick={() => void openHistory(coupon)}>צפייה</button>
                        <button type="button" className="text-xs font-semibold text-[#171717]" onClick={() => { setEditing(coupon); setEditorOpen(true); }}>עריכה</button>
                        {coupon.active ? (
                          <button type="button" className="text-xs font-semibold text-[#A90F16]" onClick={() => void disable(coupon)}>השבתה</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CouponEditor
        open={editorOpen}
        coupon={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={async () => {
          setEditorOpen(false);
          await load();
        }}
      />

      <Dialog open={history != null} onOpenChange={(open) => { if (!open) setHistory(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              {history?.code}
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {!historyLoading && redemptions.length === 0 ? <p className="text-sm text-[#70665D]">אין מימושים</p> : null}
          <div className="space-y-3">
            {redemptions.map((row) => (
              <div key={row.id} className="rounded-xl border border-[#E7D7C3] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <a className="font-semibold text-[#A90F16]" href={orderHref(row.orderNumber)}>{row.orderNumber || row.orderId}</a>
                  <span>{moneyDate(row.redeemedAt)}</span>
                </div>
                <p>{row.customerName} · <span dir="ltr">{row.customerPhone}</span></p>
                <p>{row.couponCode} · {row.orderStatus} · {row.status}</p>
                <p>{formatPrice(row.originalAmount)} − {formatPrice(row.discountAmount)} = {formatPrice(row.finalAmount)}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CouponEditor({
  open,
  coupon,
  onClose,
  onSaved,
}: {
  open: boolean;
  coupon: CouponRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const authFetch = useAuthFetch();
  const [code, setCode] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("7");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [onePerCustomer, setOnePerCustomer] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [active, setActive] = useState(true);
  const [bulk, setBulk] = useState(false);
  const [count, setCount] = useState("10");
  const [prefix, setPrefix] = useState("CRISPY");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setCode(coupon?.code || "");
    setCampaignName(coupon?.campaignName || "");
    setDiscountType(coupon?.discountType || "percent");
    setDiscountValue(String(coupon?.discountValue ?? 7));
    setMaxRedemptions(coupon?.maxRedemptions == null ? "" : String(coupon.maxRedemptions));
    setOnePerCustomer(coupon?.onePerCustomer || false);
    setStartsAt(coupon?.startsAt?.slice(0, 10) || "");
    setExpiresAt(coupon?.expiresAt?.slice(0, 10) || "");
    setMinOrderAmount(coupon?.minOrderAmount == null ? "" : String(coupon.minOrderAmount));
    setActive(coupon?.active !== false);
    setBulk(false);
  }, [open, coupon]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    const body = {
      code,
      campaignName,
      discountType,
      discountValue: Number(discountValue),
      maxRedemptions: maxRedemptions === "" ? null : Number(maxRedemptions),
      onePerCustomer,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      minOrderAmount: minOrderAmount === "" ? null : Number(minOrderAmount),
      active,
    };
    const response = coupon
      ? await authFetch(`/api/admin/coupons/${encodeURIComponent(coupon.code)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        })
      : await authFetch("/api/admin/coupons", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(bulk ? { ...body, mode: "bulk", count: Number(count), prefix } : body),
        });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) {
      setMessage(payload?.error || "השמירה נכשלה");
      return;
    }
    await onSaved();
  };

  const generate = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const suffix = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    setCode(`CRISPY-${suffix}`);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{coupon ? "עריכת קופון" : "+ إنشاء كوبون"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {!coupon ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bulk} onChange={(event) => setBulk(event.target.checked)} />
              יצירת כמה קופונים ייחודיים
            </label>
          ) : null}
          {bulk && !coupon ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="קידומת"><Input value={prefix} onChange={(event) => setPrefix(event.target.value.toUpperCase())} dir="ltr" /></Field>
              <Field label="כמות"><Input value={count} onChange={(event) => setCount(event.target.value)} inputMode="numeric" /></Field>
            </div>
          ) : (
            <Field label="קוד קופון">
              <div className="flex gap-2">
                <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} disabled={Boolean(coupon)} dir="ltr" />
                {!coupon ? <Button type="button" variant="outline" onClick={generate}>אוטומטי</Button> : null}
              </div>
            </Field>
          )}
          <Field label="שם הקמפיין"><Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="סוג הנחה">
              <select value={discountType} onChange={(event) => setDiscountType(event.target.value === "fixed" ? "fixed" : "percent")} className="h-10 w-full rounded-xl border px-3">
                <option value="percent">אחוז</option>
                <option value="fixed">סכום</option>
              </select>
            </Field>
            <Field label="גובה ההנחה"><Input value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} inputMode="decimal" /></Field>
          </div>
          <Field label="מימושים מקסימליים (ריק = ללא הגבלה)">
            <select value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} className="h-10 w-full rounded-xl border px-3">
              <option value="1">1</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="100">100</option>
              <option value="">ללא הגבלה</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onePerCustomer} onChange={(event) => setOnePerCustomer(event.target.checked)} />
            מימוש אחד לכל לקוח
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="התחלה"><Input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></Field>
            <Field label="סיום"><Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Field>
          </div>
          <Field label="סכום הזמנה מינימלי"><Input value={minOrderAmount} onChange={(event) => setMinOrderAmount(event.target.value)} inputMode="decimal" /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            פעיל
          </label>
          {message ? <p className="text-sm text-[#A90F16]">{message}</p> : null}
          <Button onClick={() => void save()} disabled={saving} className="rounded-xl bg-[#D71920] text-white hover:bg-[#A90F16]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמירה"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
