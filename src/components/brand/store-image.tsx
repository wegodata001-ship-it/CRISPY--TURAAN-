import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND, BLUR } from "@/lib/brand";

interface StoreImageProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  alt?: string;
}

export function StoreImage({
  className,
  imageClassName,
  priority = false,
  fill = true,
  sizes = "(max-width: 768px) 100vw, 1200px",
  alt = `${BRAND.name} storefront`,
}: StoreImageProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={BRAND.store}
        alt={alt}
        fill={fill}
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR.store}
        sizes={sizes}
        className={cn("object-cover object-center", imageClassName)}
      />
    </div>
  );
}

interface EmptyStateBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function EmptyStateBackground({ children, className }: EmptyStateBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <StoreImage
        className="absolute inset-0"
        imageClassName="scale-110 blur-md opacity-30"
        sizes="600px"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
