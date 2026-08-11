"use client";

import { AppLogo, type AppLogoProps } from "@/components/brand/app-logo";

interface LogoProps extends AppLogoProps {
  /** @deprecated Logo image includes brand name — ignored */
  showText?: boolean;
  /** @deprecated Logo image includes tagline — ignored */
  showTagline?: boolean;
}

/** @deprecated Prefer `AppLogo` — kept for existing imports */
export function Logo({ showText: _showText, showTagline: _showTagline, ...props }: LogoProps) {
  return <AppLogo {...props} />;
}

export { AppLogo } from "@/components/brand/app-logo";
