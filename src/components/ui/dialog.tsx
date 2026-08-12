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
      // Overlay only — never put opacity on the dialog panel itself
      "fixed inset-0 bg-black/[0.38] backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
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
   * center — viewport-centered via fixed flex wrapper (no transform positioning)
   * custom — consumer owns all positioning (side panels / bottom sheets)
   */
  layout?: "center" | "custom";
};

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, overlayClassName, layout = "center", children, ...props }, ref) => {
  const content = (
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        layout === "center"
          ? [
              // Relative inside the flex centering shell — NEVER use translate for center
              "pointer-events-auto relative flex w-full max-w-md shrink-0 flex-col gap-4",
              "max-h-[calc(100dvh-48px)] overflow-hidden rounded-[20px]",
              "border border-black/[0.06] bg-white p-6 text-dark-brown shadow-elevated outline-none opacity-100",
            ]
          : [
              "fixed grid w-full max-w-md gap-4 rounded-[20px]",
              "border border-black/[0.06] bg-white p-6 text-dark-brown shadow-elevated outline-none opacity-100",
            ],
        DIALOG_Z.content,
        // Fade only — zoom/slide would reintroduce transform bugs
        "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute end-4 top-4 rounded-lg p-1 text-coffee/60 transition-colors hover:bg-beige/60 hover:text-dark-brown focus:outline-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  );

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      {layout === "center" ? (
        <div
          className={cn(
            // Full-viewport flex shell — centers relative to VIEWPORT, not page scroll
            "pointer-events-none fixed inset-0 flex items-center justify-center overflow-y-auto p-3 sm:p-6",
            DIALOG_Z.content
          )}
        >
          <div className="flex min-h-full w-full items-center justify-center">
            {content}
          </div>
        </div>
      ) : (
        content
      )}
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
