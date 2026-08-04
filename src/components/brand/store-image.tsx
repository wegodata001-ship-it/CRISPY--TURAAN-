import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BRAND, BLUR, getStoreImageSrc } from "@/lib/brand";

interface StoreImageProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  alt?: string;
  src?: string;
}

export function StoreImage({
  className,
  imageClassName,
  priority = false,
  fill = true,
  sizes = "(max-width: 768px) 100vw, 1200px",
  alt = `${BRAND.name} storefront`,
  src: srcProp,
}: StoreImageProps) {
  const [src, setSrc] = useState(() => getStoreImageSrc(srcProp));

  useEffect(() => {
    setSrc(getStoreImageSrc(srcProp));
  }, [srcProp]);

  const handleError = () => {
    setSrc((current) => {
      if (current === BRAND.storeFallback) return current;
      if (current !== BRAND.store) return BRAND.store;
      return BRAND.storeFallback;
    });
  };

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill={fill}
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR.store}
        sizes={sizes}
        onError={handleError}
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
