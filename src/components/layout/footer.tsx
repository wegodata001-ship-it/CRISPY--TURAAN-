"use client";

import Link from "next/link";
import { Phone, MapPin, MessageCircle, Clock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useT } from "@/components/providers/locale-provider";
import { useSettings } from "@/hooks/useSettings";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  const t = useT();
  const { settings } = useSettings();

  const phone = settings?.phone ?? "";
  const address = settings?.address ?? "";
  const hours = settings?.hours ?? "";
  const whatsapp = settings?.social?.whatsapp ?? phone;
  const mapsUrl = settings?.mapsUrl ?? "";

  return (
    <footer className="mt-auto border-t border-beige-dark/15 bg-warm-white">
      <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 lg:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Hours */}
          <div>
            <h3 className="text-caption mb-3 uppercase tracking-wider">{t("footer.hours")}</h3>
            {hours ? (
              <p className="text-body whitespace-pre-line">{hours}</p>
            ) : (
              <p className="text-body text-coffee/40">—</p>
            )}
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-caption mb-3 uppercase tracking-wider">{t("footer.contact")}</h3>
            <ul className="space-y-2">
              {phone && (
                <li>
                  <a
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="text-body flex items-center gap-2 hover:text-turquoise"
                  >
                    <Phone className="h-3.5 w-3.5 text-turquoise" strokeWidth={1.75} />
                    {phone}
                  </a>
                </li>
              )}
              {address && (
                <li>
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-body flex items-start gap-2 hover:text-turquoise"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-turquoise" strokeWidth={1.75} />
                      {address}
                    </a>
                  ) : (
                    <span className="text-body flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-turquoise" strokeWidth={1.75} />
                      {address}
                    </span>
                  )}
                </li>
              )}
              {whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body flex items-center gap-2 hover:text-turquoise"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-turquoise" strokeWidth={1.75} />
                    {t("footer.whatsappChat")}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-caption mb-3 uppercase tracking-wider">{t("footer.moreInfo")}</h3>
            <ul className="space-y-2">
              {[
                { href: "/account", label: t("footer.faq") },
                { href: "#a11y-panel", label: t("footer.accessibility") },
                { href: "/account", label: t("footer.terms") },
                { href: "/account", label: t("footer.privacy") },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-body hover:text-turquoise">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Logo */}
          <div className="flex flex-col items-start sm:items-start">
            <Logo size="md" href="/" showTagline priority />
            <p className="text-caption mt-4 max-w-xs leading-relaxed">{t("footer.about")}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-beige-dark/12 pt-6 text-center sm:text-start">
          <p className="text-caption">
            © {new Date().getFullYear()} {settings?.storeName ?? BRAND.name}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
