"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminToast = {
  id: number;
  message: string;
  variant?: "success" | "error";
};

export function AdminToastStack({
  toasts,
  onDismiss,
}: {
  toasts: AdminToast[];
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    if (!toasts.length) return;
    const latest = toasts[toasts.length - 1];
    const timer = setTimeout(() => onDismiss(latest.id), 3500);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  return (
    <div className="pointer-events-none fixed bottom-6 start-6 z-[1100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-elevated",
              t.variant === "error"
                ? "bg-red-600 text-white"
                : "bg-emerald-600 text-white"
            )}
          >
            {t.variant === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

let toastCounter = 0;

export function createToast(
  message: string,
  variant: AdminToast["variant"] = "success"
): AdminToast {
  toastCounter += 1;
  return { id: toastCounter, message, variant };
}
