import { BRAND_COLORS } from "@/lib/brand";
import { getPublicSiteUrl } from "@/lib/email/config";

const COLORS = {
  primary: BRAND_COLORS.primary,
  accent: BRAND_COLORS.accent,
  cream: BRAND_COLORS.cream,
  warmWhite: BRAND_COLORS.warmWhite,
  gold: BRAND_COLORS.secondary,
  muted: "#6B5A52",
  border: "#E6D9C8",
  danger: "#B42318",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailShell(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
}): string {
  const siteUrl = getPublicSiteUrl();
  const logoUrl = `${siteUrl}/logo-transparent.png`;
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.cream};font-family:Arial,Helvetica,sans-serif;color:${COLORS.primary};">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COLORS.warmWhite};border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};">
          <tr>
            <td style="background:${COLORS.primary};padding:22px 24px;text-align:center;">
              <img src="${logoUrl}" alt="MISHKAH CAFE" width="72" height="63" style="display:inline-block;border:0;outline:none;max-width:72px;height:auto;" />
              <div style="margin-top:10px;font-size:20px;font-weight:700;letter-spacing:0.04em;color:${COLORS.warmWhite};">MISHKAH CAFE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;background:${COLORS.cream};border-top:1px solid ${COLORS.border};text-align:center;">
              <div style="font-size:13px;font-weight:700;color:${COLORS.primary};">MISHKAH CAFE</div>
              <div style="margin-top:4px;font-size:12px;color:${COLORS.muted};">Coffee • Crêpes • Desserts</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderTestEmailHtml(): { subject: string; html: string; text: string } {
  const subject = "MISHKAH CAFE — בדיקת מערכת המיילים";
  const html = emailShell({
    title: subject,
    preheader: "מערכת המיילים מחוברת בהצלחה",
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${COLORS.primary};text-align:center;">MISHKAH CAFE</h1>
      <p style="margin:0 0 10px;font-size:16px;line-height:1.6;text-align:center;color:${COLORS.primary};">
        מערכת המיילים מחוברת בהצלחה.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;text-align:center;color:${COLORS.muted};">
        זהו מייל בדיקה שנשלח באמצעות Brevo.
      </p>
    `,
  });
  const text = [
    "MISHKAH CAFE",
    "",
    "מערכת המיילים מחוברת בהצלחה.",
    "זהו מייל בדיקה שנשלח באמצעות Brevo.",
  ].join("\n");
  return { subject, html, text };
}

export type NewOrderEmailItem = {
  productName: string;
  quantity: number;
  price: number;
  modifiers?: Array<{ optionName: string; quantity?: number }>;
  notes?: string;
  kitchenNotes?: string[];
};

export type NewOrderEmailPayload = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  items: NewOrderEmailItem[];
  total: number;
  paymentMethod?: string;
  orderType?: "pickup" | "delivery";
  notes?: string;
  viewUrl: string;
};

function formatIls(amount: number): string {
  return `${amount.toFixed(2)} ₪`;
}

function formatDateHe(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: iso, time: "" };
  }
  return {
    date: d.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    time: d.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function paymentLabel(method?: string): string {
  if (!method) return "—";
  if (method === "cash") return "מזומן";
  if (method === "card") return "כרטיס אשראי";
  return method;
}

function fulfillmentLabel(type?: "pickup" | "delivery"): string {
  if (type === "delivery") return "משלוח";
  return "איסוף עצמי מהעסק";
}

export function renderNewOrderEmail(payload: NewOrderEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const { date, time } = formatDateHe(payload.createdAt);
  const subject = `הזמנה חדשה | MISHKAH CAFE | #${payload.orderNumber}`;

  const itemsHtml = payload.items
    .map((item) => {
      const modifiers = (item.modifiers ?? [])
        .map(
          (m) =>
            `<div style="padding-right:14px;font-size:13px;color:${COLORS.muted};line-height:1.5;">${escapeHtml(m.optionName)}</div>`
        )
        .join("");
      const notes = [
        ...(item.kitchenNotes ?? []),
        ...(item.notes ? [item.notes] : []),
      ]
        .filter(Boolean)
        .map(
          (n) =>
            `<div style="padding-right:14px;font-size:12px;color:${COLORS.muted};font-style:italic;">${escapeHtml(n)}</div>`
        )
        .join("");

      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};vertical-align:top;">
            <div style="font-size:15px;font-weight:700;color:${COLORS.primary};">
              ${item.quantity} × ${escapeHtml(item.productName)}
            </div>
            ${modifiers}
            ${notes}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};vertical-align:top;text-align:left;white-space:nowrap;font-size:14px;color:${COLORS.primary};">
            ${formatIls(item.price * item.quantity)}
          </td>
        </tr>`;
    })
    .join("");

  const notesBlock = payload.notes?.trim()
    ? `
      <div style="margin:18px 0 0;padding:14px 16px;border-radius:12px;background:#FFF4E5;border:1px solid #F0D2A8;">
        <div style="font-size:12px;font-weight:700;color:${COLORS.primary};margin-bottom:6px;">הערת הזמנה</div>
        <div style="font-size:14px;line-height:1.55;color:${COLORS.primary};white-space:pre-wrap;">${escapeHtml(payload.notes.trim())}</div>
      </div>`
    : "";

  const html = emailShell({
    title: subject,
    preheader: `התקבלה הזמנה חדשה #${payload.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;text-align:center;color:${COLORS.primary};">הזמנה חדשה התקבלה</h1>
      <p style="margin:0 0 22px;text-align:center;font-size:15px;color:${COLORS.accent};font-weight:700;">
        הזמנה #${escapeHtml(payload.orderNumber)}
      </p>

      <div style="margin-bottom:18px;padding:14px 16px;border-radius:12px;background:${COLORS.cream};border:1px solid ${COLORS.border};">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:${COLORS.muted};margin-bottom:10px;">פרטי לקוח</div>
        <div style="font-size:14px;line-height:1.7;color:${COLORS.primary};">
          <div><strong>שם:</strong> ${escapeHtml(payload.customerName)}</div>
          ${payload.customerPhone ? `<div><strong>טלפון:</strong> ${escapeHtml(payload.customerPhone)}</div>` : ""}
          <div><strong>תאריך:</strong> ${escapeHtml(date)}</div>
          ${time ? `<div><strong>שעה:</strong> ${escapeHtml(time)}</div>` : ""}
          <div><strong>סוג:</strong> ${escapeHtml(fulfillmentLabel(payload.orderType))}</div>
          <div><strong>תשלום:</strong> ${escapeHtml(paymentLabel(payload.paymentMethod))}</div>
        </div>
      </div>

      <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;color:${COLORS.muted};margin-bottom:8px;">פרטי ההזמנה</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${itemsHtml}
      </table>

      <div style="margin-top:16px;padding-top:14px;border-top:2px solid ${COLORS.primary};text-align:center;">
        <div style="font-size:13px;color:${COLORS.muted};">סה״כ לתשלום</div>
        <div style="font-size:24px;font-weight:700;color:${COLORS.primary};margin-top:4px;">${formatIls(payload.total)}</div>
      </div>

      ${notesBlock}

      <div style="margin-top:24px;text-align:center;">
        <a href="${escapeHtml(payload.viewUrl)}" style="display:inline-block;background:${COLORS.accent};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:700;">
          צפייה בהזמנה
        </a>
      </div>
    `,
  });

  const textLines = [
    "MISHKAH CAFE",
    "התקבלה הזמנה חדשה",
    `הזמנה #${payload.orderNumber}`,
    `תאריך: ${date}${time ? ` ${time}` : ""}`,
    `לקוח: ${payload.customerName}`,
    payload.customerPhone ? `טלפון: ${payload.customerPhone}` : "",
    `סוג: ${fulfillmentLabel(payload.orderType)}`,
    `תשלום: ${paymentLabel(payload.paymentMethod)}`,
    "",
    "פריטים:",
    ...payload.items.map((item) => {
      const mods = (item.modifiers ?? []).map((m) => `  - ${m.optionName}`).join("\n");
      return `${item.quantity} × ${item.productName}${mods ? `\n${mods}` : ""}`;
    }),
    "",
    `סה״כ: ${formatIls(payload.total)}`,
    payload.notes?.trim() ? `\nהערה:\n${payload.notes.trim()}` : "",
    "",
    `צפייה: ${payload.viewUrl}`,
  ].filter(Boolean);

  return { subject, html, text: textLines.join("\n") };
}
