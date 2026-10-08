/**
 * Server-side email configuration for CRISPY.
 * Never import this module from client components.
 */

import { adminAbsoluteUrl, getCustomerUrl } from "@/lib/public-urls";

export type MailProvider = "BREVO" | "NONE";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function getMailProvider(): MailProvider {
  const value = env("MAIL_PROVIDER", "BREVO").toUpperCase();
  return value === "BREVO" ? "BREVO" : "NONE";
}

export function getBrevoConfig() {
  return {
    apiKey: env("BREVO_API_KEY"),
    baseUrl: env("BREVO_BASE_URL", "https://api.brevo.com/v3").replace(/\/$/, ""),
    senderName: env("BREVO_SENDER_NAME", "CRISPY"),
    senderEmail: env("BREVO_SENDER_EMAIL"),
    replyTo: env("BREVO_REPLY_TO"),
  };
}

export function getNotificationEmails() {
  const notification = env("MISHKAH_NOTIFICATION_EMAIL");
  const admin = env("MISHKAH_ADMIN_EMAIL");
  const recipients = [notification, admin].filter(Boolean);
  return {
    notification,
    admin,
    /** Unique list for broadcast / test emails */
    recipients: [...new Set(recipients)],
  };
}

/** Business order alerts — primary café inbox */
export function getBusinessAlertRecipients(): string[] {
  const { notification } = getNotificationEmails();
  return notification ? [notification] : [];
}

export function getPublicSiteUrl(): string {
  return getCustomerUrl();
}

export function getPortalAdminOrderUrl(orderId: string): string {
  const base = adminAbsoluteUrl("/orders");
  return orderId ? `${base}?order=${encodeURIComponent(orderId)}` : base;
}

export function assertBrevoReady(): { ok: true } | { ok: false; error: string } {
  if (getMailProvider() !== "BREVO") {
    return { ok: false, error: "MAIL_PROVIDER is not BREVO" };
  }
  const cfg = getBrevoConfig();
  if (!cfg.apiKey) {
    return { ok: false, error: "BREVO_API_KEY is missing" };
  }
  if (!cfg.senderEmail) {
    return { ok: false, error: "BREVO_SENDER_EMAIL is missing" };
  }
  if (!cfg.senderName) {
    return { ok: false, error: "BREVO_SENDER_NAME is missing" };
  }
  return { ok: true };
}
