import { sendViaBrevo } from "@/lib/email/brevo";
import {
  getBrevoConfig,
  getMishkahNotificationEmails,
} from "@/lib/email/config";
import {
  renderNewOrderEmail,
  renderTestEmailHtml,
  type NewOrderEmailPayload,
} from "@/lib/email/templates";
import type { MishkahEmailKind, SendEmailResult } from "@/lib/email/types";

export type SendMishkahEmailOptions = {
  to?: string | string[];
  subject: string;
  html: string;
  text?: string;
  kind?: MishkahEmailKind;
};

/**
 * Central email entry-point for MISHKAH CAFE.
 * Always server-side. Never throw secrets.
 */
export async function sendMishkahEmail(
  options: SendMishkahEmailOptions
): Promise<SendEmailResult> {
  const defaultRecipients = getMishkahNotificationEmails().recipients;
  const to = options.to ?? defaultRecipients;

  const result = await sendViaBrevo({
    to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    tags: options.kind ? [`mishkah`, options.kind] : ["mishkah"],
  });

  if (!result.ok) {
    console.error("[email] Email notification failed", {
      kind: options.kind ?? "unknown",
      error: result.error,
      statusCode: result.statusCode,
      code: result.code,
      senderName: getBrevoConfig().senderName,
      // never log api key
    });
  }

  return result;
}

export async function sendMishkahTestEmail(
  to?: string | string[]
): Promise<SendEmailResult & { recipients: string[] }> {
  const recipients = to
    ? (Array.isArray(to) ? to : [to]).map((e) => e.trim()).filter(Boolean)
    : getMishkahNotificationEmails().recipients;
  const content = renderTestEmailHtml();
  const result = await sendMishkahEmail({
    to: recipients,
    subject: content.subject,
    html: content.html,
    text: content.text,
    kind: "test",
  });
  return { ...result, recipients };
}

export async function sendNewOrderNotificationEmail(
  payload: NewOrderEmailPayload
): Promise<SendEmailResult> {
  const content = renderNewOrderEmail(payload);
  return sendMishkahEmail({
    to: getMishkahNotificationEmails().recipients,
    subject: content.subject,
    html: content.html,
    text: content.text,
    kind: "new_order",
  });
}
