"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { Check } from "lucide-react";

type Step = "cart" | "details" | "payment" | "confirm";

const STEPS: Step[] = ["cart", "details", "payment", "confirm"];

const STEP_KEYS: Record<Step, string> = {
  cart: "checkout.stepCart",
  details: "checkout.stepDetails",
  payment: "checkout.stepPayment",
  confirm: "checkout.stepConfirm",
};

export function CheckoutProgress({ current }: { current: Step }) {
  const t = useT();
  const currentIndex = STEPS.indexOf(current);

  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done && "bg-turquoise text-warm-white",
                  active && "bg-turquoise/15 text-turquoise ring-2 ring-turquoise",
                  !done && !active && "bg-beige/60 text-coffee/40"
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2} /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-medium sm:block",
                  active ? "text-turquoise" : "text-coffee/45"
                )}
              >
                {t(STEP_KEYS[step])}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 sm:w-12 md:w-16",
                  i < currentIndex ? "bg-turquoise" : "bg-beige-dark/40"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
