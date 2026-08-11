import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND, LOGO_HEIGHT, type LogoSize } from "@/lib/brand";

export type AppLogoProps = {
  size?: LogoSize;
  className?: string;
  priority?: boolean;
  href?: string | null;
};

const SIZE_CLASS: Record<LogoSize, string> = {
  xs: "h-8 w-auto max-h-8",
  sm: "h-10 w-auto max-h-10 md:h-12 md:max-h-12",
  md: "h-12 w-auto max-h-12",
  lg: "h-14 w-auto max-h-14",
  xl: "h-16 w-auto max-h-16",
};

/**
 * Single source of truth for the official Mishkat logo asset.
 * Uses `public/logo-transparent.png` (derived from `public/logo.png`).
 */
export function AppLogo({
  size = "md",
  className,
  priority = false,
  href = "/",
}: AppLogoProps) {
  const height = LOGO_HEIGHT[size];
  const width = Math.round(height * BRAND.logoAspect);

  const image = (
    <Image
      src={BRAND.logo}
      alt={BRAND.name}
      width={width}
      height={height}
      priority={priority}
      className={cn("max-w-none object-contain", SIZE_CLASS[size], className)}
    />
  );

  if (href !== undefined && href !== null) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 items-center transition-opacity hover:opacity-90"
        aria-label={BRAND.name}
      >
        {image}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0 items-center">{image}</span>;
}
