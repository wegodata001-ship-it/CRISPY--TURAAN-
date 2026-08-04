"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND, BLUR, LOGO_HEIGHT, type LogoSize } from "@/lib/brand";
import { useT } from "@/components/providers/locale-provider";

interface LogoProps {
  size?: LogoSize;
  showText?: boolean;
  showTagline?: boolean;
  href?: string | null;
  className?: string;
  priority?: boolean;
}

export function Logo({
  size = "md",
  showText = false,
  showTagline = false,
  href = "/",
  className,
  priority = false,
}: LogoProps) {
  const t = useT();
  const height = LOGO_HEIGHT[size];
  const width = Math.round(height * 0.85);

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src={BRAND.logo}
        alt={BRAND.name}
        width={width}
        height={height}
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR.logo}
        className="h-auto w-auto object-contain"
        style={{ height, width: "auto", maxWidth: width * 1.4 }}
      />
      {(showText || showTagline) && (
        <div className="min-w-0">
          {showText && (
            <p className="font-display text-sm font-bold leading-tight text-dark-brown md:text-base">
              {BRAND.name}
            </p>
          )}
          {showTagline && (
            <p className="text-[10px] tracking-wide text-turquoise md:text-xs">
              {t("brand.tagline")}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (href !== undefined && href !== null) {
    return (
      <Link href={href} className="shrink-0 transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
