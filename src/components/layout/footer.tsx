"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, Share2, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useT } from "@/components/providers/locale-provider";
import { useSettings } from "@/hooks/useSettings";
import { BRAND } from "@/lib/brand";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function SiteFooter() {
  const t = useT();
  const { settings } = useSettings();

  const phone = settings?.phone ?? "";
  const address = settings?.address ?? "";
  const hours = settings?.hours ?? "";
  const whatsapp = settings?.social?.whatsapp ?? phone;
  const instagram = settings?.social?.instagram ?? "";
  const facebook = settings?.social?.facebook ?? "";
  const mapsUrl = settings?.mapsUrl ?? "";

  return (
    <footer className="mt-auto border-t border-beige-dark/20 bg-gradient-to-b from-warm-white/80 to-beige/30">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Column 1 — Brand */}
          <div className="lg:col-span-1">
            <Logo size="md" href="/" showText showTagline />
            <p className="mt-4 text-sm leading-relaxed text-coffee/60">{t("footer.about")}</p>
            <div className="mt-5 flex gap-2">
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-beige/60 text-coffee transition-colors hover:bg-turquoise hover:text-warm-white"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                </a>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-beige/60 text-coffee transition-colors hover:bg-turquoise hover:text-warm-white"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("common.whatsapp")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-beige/60 text-coffee transition-colors hover:bg-turquoise hover:text-warm-white"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                </a>
              )}
            </div>
          </div>

          {/* Column 2 — Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-coffee/50">
              {t("footer.quickLinks")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/", label: t("nav.home") },
                { href: "/catalog", label: t("nav.catalog") },
                { href: "/#offers", label: t("footer.offers") },
                { href: "/#menu", label: t("footer.aboutUs") },
                { href: "/account", label: t("footer.contact") },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-coffee/70 transition-colors hover:text-turquoise"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Customer Service */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-coffee/50">
              {t("footer.customerService")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/account", label: t("footer.faq") },
                { href: "#a11y-panel", label: t("footer.accessibility") },
                { href: "/account", label: t("footer.terms") },
                { href: "/account", label: t("footer.privacy") },
                { href: "/account", label: t("footer.refund") },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-coffee/70 transition-colors hover:text-turquoise"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Contact */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-coffee/50">
              {t("footer.contact")}
            </h3>
            <ul className="mt-4 space-y-3">
              {phone && (
                <li>
                  <a
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-2 text-sm text-coffee/70 hover:text-turquoise"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-turquoise" strokeWidth={1.75} />
                    {phone}
                  </a>
                </li>
              )}
              {whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-coffee/70 hover:text-turquoise"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-turquoise" strokeWidth={1.75} />
                    {t("common.whatsapp")}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`mailto:info@${BRAND.name.toLowerCase().replace(/\s/g, "")}.com`}
                  className="flex items-center gap-2 text-sm text-coffee/70 hover:text-turquoise"
                >
                  <Mail className="h-4 w-4 shrink-0 text-turquoise" strokeWidth={1.75} />
                  {t("footer.email")}
                </a>
              </li>
              {address && (
                <li>
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-sm text-coffee/70 hover:text-turquoise"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-turquoise" strokeWidth={1.75} />
                      <span>{address}</span>
                    </a>
                  ) : (
                    <span className="flex items-start gap-2 text-sm text-coffee/70">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-turquoise" strokeWidth={1.75} />
                      {address}
                    </span>
                  )}
                </li>
              )}
              {mapsUrl && (
                <li>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-turquoise hover:underline"
                  >
                    {t("footer.maps")}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Column 5 — Hours */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-coffee/50">
              {t("footer.hours")}
            </h3>
            {hours ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-coffee/70">{hours}</p>
            ) : (
              <ul className="mt-4 space-y-1.5">
                {DAYS.map((day) => (
                  <li key={day} className="flex justify-between text-sm text-coffee/60">
                    <span>{t(`footer.day.${day}`)}</span>
                    <span>—</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-beige-dark/20 pt-6 text-center sm:flex-row sm:text-start">
          <p className="text-xs text-coffee/45">
            © {new Date().getFullYear()} {BRAND.name}. {t("footer.rights")}
          </p>
          <p className="text-xs text-coffee/35">
            {t("footer.developedBy")} MISHKAT · {t("footer.version")} 1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
