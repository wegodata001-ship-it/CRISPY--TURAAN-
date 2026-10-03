import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND, LOGO_HEIGHT, type LogoSize } from "@/lib/brand";

export type AppLogoProps = {
  size?: LogoSize;
  className?: string;
  priority?: boolean;
  href?: string | null;
  pulse?: boolean;
};

const SIZE_CLASS: Record<LogoSize, string> = {
  xs: "h-8 w-auto max-h-8",
  sm: "h-10 w-auto max-h-10 md:h-12 md:max-h-12",
  md: "h-12 w-auto max-h-12",
  lg: "h-14 w-auto max-h-14",
  xl: "h-16 w-auto max-h-16",
};

/**
 * Single CRISPY logo. The PNG has real alpha — wrappers stay transparent.
 */
export function AppLogo({
  size = "md",
  className,
  priority = false,
  href = "/",
  pulse = false,
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
      placeholder="empty"
      unoptimized
      className={cn("bg-transparent object-contain", pulse && "crispy-logo-pulse")}
      style={{
        backgroundColor: "transparent",
        width: "auto",
        height: "100%",
        maxHeight: "100%",
      }}
    />
  );

  const wrapClass = cn(
    "inline-flex shrink-0 items-center border-0 bg-transparent p-0 shadow-none",
    SIZE_CLASS[size],
    className
  );

  if (href !== undefined && href !== null) {
    return (
      <Link href={href} className={wrapClass} aria-label={BRAND.name}>
        {image}
      </Link>
    );
  }

  return <span className={wrapClass}>{image}</span>;
}
