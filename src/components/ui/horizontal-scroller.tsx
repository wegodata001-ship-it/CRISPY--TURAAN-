"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import {
  applyHorizontalDrag,
  getHorizontalOverflowState,
  scrollChildIntoHorizontalView,
  scrollHorizontalBy,
  type HorizontalOverflowState,
} from "@/lib/dom/horizontal-scroll";
import { cn } from "@/lib/utils";

const DRAG_THRESHOLD_PX = 6;
const ARROW_SCROLL_PX = 300;

type HorizontalScrollerProps = {
  children: ReactNode;
  className?: string;
  /** Classes on the scrolling flex row */
  contentClassName?: string;
  /** When this changes, scroll `[data-hscroll-active="true"]` into view */
  activeKey?: string | null;
  /** Show edge arrow buttons on pointer devices when overflow exists */
  showArrows?: boolean;
  /** Show edge fade when more content exists in that direction */
  showFades?: boolean;
  /** Tailwind from-* color for edge fades (match parent background) */
  fadeFromClassName?: string;
  "aria-label"?: string;
};

export function HorizontalScroller({
  children,
  className,
  contentClassName,
  activeKey,
  showArrows = true,
  showFades = true,
  fadeFromClassName = "from-cream",
  "aria-label": ariaLabel,
}: HorizontalScrollerProps) {
  const { dir } = useLocale();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<HorizontalOverflowState>({
    canScrollStart: false,
    canScrollEnd: false,
    hasOverflow: false,
  });

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    lastX: number;
    dragging: boolean;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const refreshOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setOverflow(getHorizontalOverflowState(el));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    refreshOverflow();

    const onScroll = () => refreshOverflow();
    el.addEventListener("scroll", onScroll, { passive: true });

    const onWheel = (event: WheelEvent) => {
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      // Prefer native horizontal trackpad gestures
      if (absX > absY) {
        refreshOverflow();
        return;
      }
      if (absY < 0.5) return;

      const state = getHorizontalOverflowState(el);
      if (!state.hasOverflow) return;

      const delta = event.deltaY;
      const towardEnd = delta > 0;
      if (towardEnd && !state.canScrollEnd) return;
      if (!towardEnd && !state.canScrollStart) return;

      const moved = scrollHorizontalBy(el, delta, "auto");
      if (moved) {
        event.preventDefault();
        refreshOverflow();
      }
    };

    // Must be non-passive so vertical wheel can convert to horizontal scroll
    el.addEventListener("wheel", onWheel, { passive: false });

    const ro = new ResizeObserver(() => refreshOverflow());
    ro.observe(el);
    Array.from(el.children).forEach((child) => ro.observe(child));

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, [refreshOverflow, children]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || activeKey == null) return;

    const frame = requestAnimationFrame(() => {
      const target = el.querySelector<HTMLElement>(
        '[data-hscroll-active="true"]'
      );
      if (target) {
        scrollChildIntoHorizontalView(el, target, "smooth");
        window.setTimeout(refreshOverflow, 350);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeKey, refreshOverflow]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      dragging: false,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || drag.pointerId !== event.pointerId) return;
    if (event.pointerType === "touch") return;

    const dx = event.clientX - drag.lastX;
    const total = Math.abs(event.clientX - drag.startX);

    if (!drag.dragging && total >= DRAG_THRESHOLD_PX) {
      drag.dragging = true;
      drag.moved = true;
      suppressClickRef.current = true;
      el.setPointerCapture(event.pointerId);
    }

    if (drag.dragging && dx !== 0) {
      applyHorizontalDrag(el, dx);
      drag.lastX = event.clientX;
      refreshOverflow();
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.dragging && el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;

    if (drag.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  const scrollByArrow = (towardEnd: boolean) => {
    const el = scrollerRef.current;
    if (!el) return;
    scrollHorizontalBy(el, towardEnd ? ARROW_SCROLL_PX : -ARROW_SCROLL_PX, "smooth");
    window.setTimeout(refreshOverflow, 350);
  };

  const isRtl = dir === "rtl";
  const StartIcon = isRtl ? ChevronRight : ChevronLeft;
  const EndIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className={cn("relative min-w-0", className)}>
      {showFades && overflow.canScrollStart ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 z-[1] w-8 to-transparent",
            fadeFromClassName,
            isRtl ? "end-0 bg-gradient-to-l" : "start-0 bg-gradient-to-r"
          )}
        />
      ) : null}
      {showFades && overflow.canScrollEnd ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 z-[1] w-8 to-transparent",
            fadeFromClassName,
            isRtl ? "start-0 bg-gradient-to-r" : "end-0 bg-gradient-to-l"
          )}
        />
      ) : null}

      {showArrows && overflow.canScrollStart ? (
        <button
          type="button"
          aria-label="Scroll categories start"
          onClick={() => scrollByArrow(false)}
          className={cn(
            "absolute top-1/2 z-[2] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
            "bg-warm-white/95 text-coffee shadow-soft ring-1 ring-beige-dark/20",
            "transition hover:text-turquoise md:flex",
            isRtl ? "end-0" : "start-0"
          )}
        >
          <StartIcon className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : null}

      {showArrows && overflow.canScrollEnd ? (
        <button
          type="button"
          aria-label="Scroll categories end"
          onClick={() => scrollByArrow(true)}
          className={cn(
            "absolute top-1/2 z-[2] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
            "bg-warm-white/95 text-coffee shadow-soft ring-1 ring-beige-dark/20",
            "transition hover:text-turquoise md:flex",
            isRtl ? "start-0" : "end-0"
          )}
        >
          <EndIcon className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : null}

      <div
        ref={scrollerRef}
        role="navigation"
        aria-label={ariaLabel}
        dir={dir}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
        className={cn(
          "hide-scrollbar flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden",
          "overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          "cursor-grab active:cursor-grabbing select-none",
          "touch-pan-x",
          showArrows && overflow.hasOverflow && "md:px-9",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
