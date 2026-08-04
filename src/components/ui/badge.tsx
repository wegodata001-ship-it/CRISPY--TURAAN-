import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-coffee text-warm-white",
        new: "bg-turquoise text-warm-white",
        popular: "bg-gold/90 text-warm-white",
        secondary: "bg-beige text-coffee",
        outline: "border border-beige-dark/50 text-coffee",
        pending: "bg-amber-100 text-amber-700",
        preparing: "bg-blue-100 text-blue-700",
        ready: "bg-emerald-100 text-emerald-700",
        delivered: "bg-green-100 text-green-700",
        cancelled: "bg-red-100 text-red-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
