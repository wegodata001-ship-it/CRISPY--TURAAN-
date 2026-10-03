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
        popular: "bg-gold text-dark-brown",
        secondary: "bg-beige text-coffee",
        outline: "border border-beige-dark/50 text-coffee",
        pending: "bg-gold/25 text-dark-brown",
        preparing: "bg-orange-100 text-orange-800",
        ready: "bg-emerald-100 text-emerald-800",
        delivered: "bg-[#2E9B55]/15 text-[#2E9B55]",
        cancelled: "bg-red-100 text-red-700",
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
