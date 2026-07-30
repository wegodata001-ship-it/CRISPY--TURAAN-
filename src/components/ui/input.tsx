import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-xl border border-beige-dark/40 bg-warm-white/80 px-4 py-2 text-sm text-dark-brown placeholder:text-coffee/50 transition-all duration-200 focus:border-turquoise/50 focus:bg-warm-white focus:outline-none focus:ring-2 focus:ring-turquoise/20 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
