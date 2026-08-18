"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { A4_HEIGHT_PX, A4_WIDTH_PX } from "@/lib/pdf-menu/a4";
import { cn } from "@/lib/utils";

interface A4StageProps {
  children: ReactNode;
  /** Optional pixel cap. By default the page fits the container width. */
  maxWidth?: number;
  className?: string;
}

/** Real A4 DOM (794×1123px) scaled only by a wrapper. Never used for PDF capture. */
export function A4Stage({ children, maxWidth, className }: A4StageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const available = maxWidth ? Math.min(el.clientWidth, maxWidth) : el.clientWidth;
      setScale(Math.max(0.15, Math.min(1, available / A4_WIDTH_PX)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth]);

  return (
    <div ref={ref} className={cn("preview-stage w-full", className)}>
      <div
        style={{
          width: A4_WIDTH_PX * scale,
          height: A4_HEIGHT_PX * scale,
          marginInline: "auto",
          overflow: "hidden",
          boxShadow: "0 18px 48px rgba(61, 43, 36, 0.16)",
          background: "#fffaf6",
        }}
      >
        <div
          className="preview-scale"
          style={{
            width: A4_WIDTH_PX,
            height: A4_HEIGHT_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
