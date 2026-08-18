"use client";

import type { PdfCoverSettings, PdfFooterSettings, PdfQrSettings } from "@/types/pdf-menu";

interface CoverSettingsPanelProps {
  cover: PdfCoverSettings;
  footer: PdfFooterSettings;
  qr: PdfQrSettings;
  onUpdateCover: (updates: Record<string, unknown>) => void;
  onUpdateFooter: (updates: Record<string, unknown>) => void;
  onUpdateQr: (updates: Record<string, unknown>) => void;
}

export function CoverSettingsPanel({
  cover,
  footer,
  qr,
  onUpdateCover,
  onUpdateFooter,
  onUpdateQr,
}: CoverSettingsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Cover Page */}
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-coffee/40">صفحة الغلاف</h4>
          <ToggleSwitch checked={cover.enabled} onChange={(v) => onUpdateCover({ enabled: v })} />
        </div>

        {cover.enabled && (
          <div className="mt-3 space-y-2.5">
            <Field label="اسم النشاط" value={cover.businessName} onChange={(v) => onUpdateCover({ businessName: v })} />
            <Field label="العنوان الفرعي" value={cover.subtitle} onChange={(v) => onUpdateCover({ subtitle: v })} />
            <Field label="الهاتف" value={cover.phone} onChange={(v) => onUpdateCover({ phone: v })} />
            <Field label="Instagram" value={cover.instagram} onChange={(v) => onUpdateCover({ instagram: v })} />
            <Field label="WhatsApp" value={cover.whatsapp} onChange={(v) => onUpdateCover({ whatsapp: v })} />
            <Field label="رابط اللوغو" value={cover.logoUrl} onChange={(v) => onUpdateCover({ logoUrl: v })} placeholder="https://..." />
            <Field label="صورة الخلفية" value={cover.backgroundUrl} onChange={(v) => onUpdateCover({ backgroundUrl: v })} placeholder="https://..." />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-coffee/40">التذييل</h4>
          <ToggleSwitch checked={footer.enabled} onChange={(v) => onUpdateFooter({ enabled: v })} />
        </div>

        {footer.enabled && (
          <div className="mt-3 space-y-2.5">
            <Field label="اسم النشاط" value={footer.businessName} onChange={(v) => onUpdateFooter({ businessName: v })} />
            <Field label="الهاتف" value={footer.phone} onChange={(v) => onUpdateFooter({ phone: v })} />
            <Field label="Instagram" value={footer.instagram} onChange={(v) => onUpdateFooter({ instagram: v })} />
            <Field label="الموقع" value={footer.website} onChange={(v) => onUpdateFooter({ website: v })} />
            <label className="flex items-center justify-between">
              <span className="text-xs text-dark-brown">رقم الصفحة</span>
              <ToggleSwitch checked={footer.showPageNumber} onChange={(v) => onUpdateFooter({ showPageNumber: v })} />
            </label>
          </div>
        )}
      </div>

      {/* QR */}
      <div className="rounded-2xl border border-beige-dark/15 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-coffee/40">رمز QR</h4>
          <ToggleSwitch checked={qr.enabled} onChange={(v) => onUpdateQr({ enabled: v })} />
        </div>

        {qr.enabled && (
          <div className="mt-3 space-y-2.5">
            <Field label="الرابط" value={qr.url} onChange={(v) => onUpdateQr({ url: v })} placeholder="https://..." />
            <div>
              <span className="text-xs text-dark-brown">الموقع</span>
              <div className="mt-1 flex gap-1">
                {(["cover", "last-page", "footer"] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => onUpdateQr({ position: pos })}
                    className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                      qr.position === pos ? "bg-turquoise text-white" : "bg-beige/50 text-coffee/60 hover:bg-beige"
                    }`}
                  >
                    {pos === "cover" ? "الغلاف" : pos === "last-page" ? "الأخيرة" : "التذييل"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-coffee/50">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-beige-dark/20 px-2.5 py-1.5 text-xs text-dark-brown placeholder:text-coffee/25 focus:border-turquoise focus:outline-none"
      />
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        checked ? "bg-turquoise" : "bg-beige-dark/25"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? "end-0.5" : "start-0.5"
        }`}
      />
    </button>
  );
}
