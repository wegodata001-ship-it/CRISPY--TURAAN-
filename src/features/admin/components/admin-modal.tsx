"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

// ─────────────────────────────────────────────────────────────
// Z-INDEX HIERARCHY
// ─────────────────────────────────────────────────────────────
const MODAL_Z = {
  overlay: 1000,
  panel: 1010,
  nested: 1020,
  toast: 1100,
} as const;

// ─────────────────────────────────────────────────────────────
// SIZE TOKENS
// ─────────────────────────────────────────────────────────────
type AdminModalSize = "sm" | "md" | "lg" | "xl" | "product";

const SIZE_STYLES: Record<AdminModalSize, string> = {
  sm: "w-[min(520px,calc(100vw-24px))]",
  md: "w-[min(680px,calc(100vw-24px))] sm:w-[min(680px,calc(100vw-48px))]",
  lg: "w-[min(820px,calc(100vw-24px))] sm:w-[min(820px,calc(100vw-48px))]",
  xl: "w-[min(900px,calc(100vw-24px))] sm:w-[min(900px,calc(100vw-48px))]",
  product: "w-[min(900px,calc(100vw-24px))] sm:w-[min(900px,calc(100vw-48px))]",
};

// ─────────────────────────────────────────────────────────────
// ERROR BOUNDARY — keeps the panel visible on child crash
// ─────────────────────────────────────────────────────────────
interface ErrorBoundaryState {
  error: Error | null;
}

class AdminModalErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode; onError?: (error: Error) => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ADMIN_MODAL_ERROR]", error, info.componentStack);
    this.props.onError?.(error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <p className="text-base font-semibold text-red-700">
            לא הצלחנו לטעון את הטופס
          </p>
          <p className="max-w-sm text-sm text-coffee/60">
            {this.state.error.message}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-xl bg-turquoise px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-turquoise/90"
            >
              נסה שוב
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────
// SCROLL LOCK — prevents page scroll when modal is open
// ─────────────────────────────────────────────────────────────
function useScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    const body = document.body;
    if (!body) return;
    const original = body.style.overflow;
    const originalPR = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      if (!document.body) return;
      document.body.style.overflow = original;
      document.body.style.paddingRight = originalPR;
    };
  }, [active]);
}

// ─────────────────────────────────────────────────────────────
// FOCUS TRAP — keeps focus inside the modal panel
// ─────────────────────────────────────────────────────────────
function useFocusTrap(panelRef: React.RefObject<HTMLDivElement | null>, active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = panel!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active, panelRef]);
}

// ─────────────────────────────────────────────────────────────
// ADMIN MODAL — main component
// ─────────────────────────────────────────────────────────────
interface AdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: AdminModalSize;
  title?: React.ReactNode;
  /** If true, clicking overlay does NOT close the modal */
  preventOverlayClose?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AdminModal({
  open,
  onOpenChange,
  size = "md",
  title,
  preventOverlayClose = false,
  children,
  className,
}: AdminModalProps) {
  const { dir } = useLocale();
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const errorBoundaryRef = React.useRef<AdminModalErrorBoundary>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(open);
  useFocusTrap(panelRef, open);

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  // Reset error boundary when modal re-opens
  React.useEffect(() => {
    if (open) {
      errorBoundaryRef.current?.reset();
    }
  }, [open]);

  // Diagnostic logging
  React.useEffect(() => {
    if (open) {
      console.log("[ADMIN_MODAL_OPEN]", { title, size, timestamp: Date.now() });
    }
  }, [open, title, size]);

  if (!mounted || !open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (preventOverlayClose) return;
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  const modal = (
    <>
      {/* OVERLAY — dimmer only, sibling of positioner */}
      <div
        data-slot="admin-modal-overlay"
        className="fixed inset-0 bg-black/[0.38] backdrop-blur-[2px]"
        style={{ zIndex: MODAL_Z.overlay }}
        aria-hidden="true"
      />

      {/* POSITIONER — centers the panel in viewport */}
      <div
        data-slot="admin-modal-positioner"
        className="fixed inset-0 flex items-center justify-center overflow-y-auto p-2 sm:p-6"
        style={{ zIndex: MODAL_Z.panel }}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
      >
        {/* PANEL — always visible when open=true */}
        <div
          ref={panelRef}
          data-slot="admin-modal-panel"
          dir={dir}
          className={cn(
            "pointer-events-auto relative flex shrink-0 flex-col",
            "max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-48px)]",
            "overflow-hidden rounded-[20px]",
            "border border-black/[0.06] shadow-elevated outline-none",
            SIZE_STYLES[size],
            className
          )}
          style={{
            backgroundColor: "#FFFFFF",
            opacity: 1,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <AdminModalErrorBoundary
            ref={errorBoundaryRef}
            onError={(err) => console.error("[ADMIN_MODAL_CONTENT_ERROR]", err)}
          >
            {children}
          </AdminModalErrorBoundary>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS — Header / Body / Footer
// ─────────────────────────────────────────────────────────────
export function AdminModalHeader({
  className,
  children,
  onClose,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  const { dir } = useLocale();
  return (
    <div
      data-slot="admin-modal-header"
      className={cn(
        "relative shrink-0 border-b border-beige-dark/20 bg-white px-5 py-4 pe-12 text-start sm:px-6 dark:border-white/10 dark:bg-[#1a1412]",
        className
      )}
      {...props}
    >
      {children}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute top-4 z-10 rounded-lg p-1 text-coffee/60 transition-colors hover:bg-beige/60 hover:text-dark-brown focus:outline-none",
            dir === "rtl" ? "start-4" : "end-4"
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function AdminModalTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("font-display text-lg font-semibold text-dark-brown sm:text-xl", className)}
      {...props}
    />
  );
}

export function AdminModalBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="admin-modal-body"
      className={cn(
        "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 sm:px-6",
        className
      )}
      {...props}
    />
  );
}

export function AdminModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="admin-modal-footer"
      className={cn(
        "flex shrink-0 items-center justify-end gap-3 border-t border-beige-dark/20 bg-white px-5 py-4 sm:px-6 dark:border-white/10 dark:bg-[#1a1412]",
        className
      )}
      {...props}
    />
  );
}

// Re-export for convenience
export { MODAL_Z, AdminModalErrorBoundary };
export type { AdminModalSize };
