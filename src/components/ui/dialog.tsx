import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Single z-index hierarchy for overlays:
 * content/sidebar 0–50 · dropdown 100 · popover 200 ·
 * fullscreen surfaces (kitchen) 900 ·
 * modal overlay 1000 · modal content 1010 · nested select 1020 · toast 1100
 */
export const DIALOG_Z = {
  overlay: "z-[1000]",
  content: "z-[1010]",
  nested: "z-[1020]",
  toast: "z-[1100]",
  fullscreen: "z-[900]",
} as const;

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Background alpha only — NEVER use opacity on this node when Content is nested
      "fixed inset-0 bg-black/[0.38] backdrop-blur-[2px]",
      DIALOG_Z.overlay,
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  overlayClassName?: string;
  /**
   * center — Content nested inside Overlay (Radix scrollable-overlay pattern)
   * custom — consumer owns positioning (side panels / bottom sheets)
   */
  layout?: "center" | "custom";
};

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, overlayClassName, layout = "center", children, style, ...props }, ref) => {
  const closeButton = (
    <DialogPrimitive.Close className="absolute end-4 top-4 z-10 rounded-lg p-1 text-coffee/60 transition-colors hover:bg-beige/60 hover:text-dark-brown focus:outline-none">
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  );

  if (layout === "custom") {
    // Consumer owns position (bottom sheet / side panel). Do NOT force white
    // full-bleed — only keep opacity:1 so parents never wash out the panel.
    return (
      <DialogPortal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-[1010] outline-none",
            className
          )}
          style={{ opacity: 1, ...style }}
          {...props}
        >
          {children}
          {closeButton}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }

  // Official Radix pattern: nest Content inside Overlay (viewport center, no translate).
  // Opaque panel styles are inline so production CSS purge cannot hide the dialog.
  return (
    <DialogPortal>
      <DialogOverlay
        className={cn(
          "flex items-center justify-center overflow-y-auto p-3 sm:p-6",
          overlayClassName
        )}
      >
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "relative my-auto flex w-full max-w-md shrink-0 flex-col gap-4",
            "max-h-[calc(100dvh-48px)] overflow-hidden rounded-[20px]",
            "border border-black/[0.06] p-6 text-dark-brown shadow-elevated outline-none",
            className
          )}
          style={{ backgroundColor: "#FFFFFF", opacity: 1, ...style }}
          {...props}
        >
          {children}
          {closeButton}
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props}
  />
);

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-xl font-semibold text-dark-brown", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-coffee/70", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
};
