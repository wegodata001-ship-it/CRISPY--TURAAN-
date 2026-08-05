"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getProductImage, PRODUCT_IMAGE_FALLBACK } from "@/lib/menu/placeholders";

interface ProductImageProps {
  image?: string | null;
  categoryId: string;
  alt: string;
  compact?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function ProductImage({
  image,
  categoryId,
  alt,
  compact,
  sizes,
  priority,
  className,
}: ProductImageProps) {
  const initialSrc = getProductImage(image, categoryId);
  const [src, setSrc] = useState(initialSrc);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const next = getProductImage(image, categoryId);
    setSrc(next);
    setLoaded(false);
    setFailed(false);
  }, [image, categoryId]);

  const handleError = useCallback(() => {
    if (src !== PRODUCT_IMAGE_FALLBACK) {
      setSrc(PRODUCT_IMAGE_FALLBACK);
      setLoaded(false);
      return;
    }
    setFailed(true);
  }, [src]);

  if (failed) {
    return (
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-coffee/20 via-beige/40 to-turquoise/15",
          className
        )}
        aria-hidden
      />
    );
  }

  return (
    <>
      {!loaded && <Skeleton className={cn("absolute inset-0 rounded-none", className)} />}
      <Image
        key={src}
        src={src}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? undefined : "lazy"}
        sizes={sizes ?? (compact ? "220px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px")}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={cn(
          "object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </>
  );
}
