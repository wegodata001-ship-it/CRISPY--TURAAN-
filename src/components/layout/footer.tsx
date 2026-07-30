import Image from "next/image";
import { BRAND, BLUR } from "@/lib/brand";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-beige-dark/20 bg-warm-white/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 md:px-6">
        <Logo size="sm" href="/" showText showTagline />

        <div className="flex items-center gap-3">
          <div className="relative h-10 w-14 overflow-hidden rounded-lg shadow-soft">
            <Image
              src={BRAND.store}
              alt="Our café"
              fill
              placeholder="blur"
              blurDataURL={BLUR.store}
              sizes="56px"
              className="object-cover object-center"
            />
          </div>
          <p className="hidden text-xs text-coffee/50 sm:block">
            {BRAND.taglineAlt}
          </p>
        </div>
      </div>
    </footer>
  );
}
