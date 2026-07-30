"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-coffee text-warm-white shadow-soft hover:bg-coffee-light hover:shadow-elevated active:scale-[0.98]",
        secondary:
          "bg-beige text-dark-brown hover:bg-beige-dark/80 active:scale-[0.98]",
        outline:
          "border border-beige-dark/50 bg-warm-white/80 text-dark-brown hover:bg-beige/50 active:scale-[0.98]",
        ghost:
          "text-dark-brown hover:bg-beige/60 active:scale-[0.98]",
        turquoise:
          "bg-turquoise text-warm-white shadow-soft hover:bg-turquoise-light active:scale-[0.98]",
        destructive:
          "bg-red-500/10 text-red-600 hover:bg-red-500/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
