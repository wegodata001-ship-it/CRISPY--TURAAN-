import { sendViaBrevo } from "@/lib/email/brevo";
import {
  getBrevoConfig,
  getBusinessAlertRecipients,
  getNotificationEmails,
} from "@/lib/email/config";
import {
  renderCriticalCheckoutFailureEmail,
  renderNewOrderEmail,
  renderOrderCancelledEmail,
  renderOrderUpdatedEmail,
  renderTestEmailHtml,
  type OrderEmailBase,
} from "@/lib/email/templates";
import type { OrderChange } from "@/lib/email/significant-diff";
import type { BusinessEmailKind, SendEmailResult } from "@/lib/email/types";

export type SendBusinessEmailOptions = {
  to?: string | string[];
  subject: string;
  html: string;
  text?: string;
  kind?: BusinessEmailKind;
};

/**
 * Central email entry-point for CRISPY.
 * Always server-side. Never throw secrets.
 */
export async function sendBusinessEmail(
  options: SendBusinessEmailOptions
): Promise<SendEmailResult> {
  const defaultRecipients = getBusinessAlertRecipients();
  const to = options.to ?? defaultRecipients;

  const result = await sendViaBrevo({
    to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    tags: options.kind ? [`crispy`, options.kind] : ["crispy"],
  });

  if (!result.ok) {
    console.error("[email] Email notification failed", {
      kind: options.kind ?? "unknown",
      error: result.error,
      statusCode: result.statusCode,
      code: result.code,
      senderName: getBrevoConfig().senderName,
    });
  }

  return result;
}

export async function sendBusinessTestEmail(
  to?: string | string[]
): Promise<SendEmailResult & { recipients: string[] }> {
  const recipients = to
    ? (Array.isArray(to) ? to : [to]).map((e) => e.trim()).filter(Boolean)
    : getNotificationEmails().recipients;
  const content = renderTestEmailHtml();
  const result = await sendBusinessEmail({
    to: recipients,
    subject: content.subject,
    html: content.html,
    text: content.text,
    kind: "test",
  });
  return { ...result, recipients };
}

export async function sendNewOrderNotificationEmail(
  payload: OrderEmailBase
): Promise<SendEmailResult> {
  const content = renderNewOrderEmail(payload);
  return sendBusinessEmail({
    subject: content.subject,
    html: content.html,
    text: content.text,
    kind: "new_order",
  });
}

export async function sendOrderUpdatedNotificationEmail(
  payload: OrderEmailBase & { changes: OrderChange[] }
): Promise<SendEmailResult> {
  const content = renderOrderUpdatedEmail(payload);
  return sendBusinessEmail({
    subject: content.subject,
    html: content.html,
    text: content.text,
    kind: "order_updated",
  });
}

export async function sendOrderCancelledNotificationEmail(
  payload: OrderEmailBase & { cancelReason?: string }
): Promise<SendEmailResult> {
  const content = renderOrderCancelledEmail(payload);
  return sendBusinessEmail({
    subject: content.subject,
    html: content.html,
    text: content.text,
    kind: "order_cancelled",
  });
}

export async function sendCriticalCheckoutFailureEmail(payload: {
  message: string;
  code?: string;
  occurredAt: string;
}): Promise<SendEmailResult> {
  const content = renderCriticalCheckoutFailureEmail(payload);
  return sendBusinessEmail({
    subject: content.subject,
    html: content.html,
    text: content.text,
    kind: "system",
  });
}
