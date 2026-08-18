"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  getMenuImageHealthVersion,
  markMenuImageFailed,
  resolveMenuImageSrc,
  sanitizeMenuImageUrl,
  subscribeMenuImageHealth,
} from "@/lib/pdf-menu/menu-image";

type MenuImageMode = "preview" | "pdf" | "thumb" | "export";

interface SafeMenuImageProps {
  src?: string | null;
  alt?: string;
  mode?: MenuImageMode;
  productId?: string;
  productName?: string;
  style?: CSSProperties;
  className?: string;
  timeoutMs?: number;
}

export function SafeMenuImage({
  src,
  alt = "",
  mode = "preview",
  productId,
  productName,
  style,
  className,
  timeoutMs = 4000,
}: SafeMenuImageProps) {
  const resolved = resolveMenuImageSrc(src, mode);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(resolved);

  const timerRef = useRef(0);

  useEffect(() => {
    setFailed(false);
    setCurrent(resolveMenuImageSrc(src, mode));
  }, [src, mode]);

  useEffect(() => {
    if (!current) return;
    timerRef.current = window.setTimeout(() => {
      const original = sanitizeMenuImageUrl(src);
      if (original?.startsWith("/") || original?.startsWith("data:")) return;
      setFailed(true);
      if (original) markMenuImageFailed(original, { productId, productName, reason: "timeout" });
    }, timeoutMs);
    return () => window.clearTimeout(timerRef.current);
  }, [current, src, productId, productName, timeoutMs]);

  if (!current || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      decoding="async"
      onLoad={(event) => {
        window.clearTimeout(timerRef.current);
        if (event.currentTarget.naturalWidth === 0) {
          setFailed(true);
          const original = sanitizeMenuImageUrl(src);
          if (original) markMenuImageFailed(original, { productId, productName, reason: "empty" });
        }
      }}
      onError={() => {
        window.clearTimeout(timerRef.current);
        setFailed(true);
        const original = sanitizeMenuImageUrl(src);
        if (original) markMenuImageFailed(original, { productId, productName, reason: "load-error" });
      }}
      style={{ display: "block", objectFit: "cover", ...style }}
    />
  );
}

export function useMenuImageHealthVersion(): string {
  return useSyncExternalStore(subscribeMenuImageHealth, getMenuImageHealthVersion, () => "0");
}
