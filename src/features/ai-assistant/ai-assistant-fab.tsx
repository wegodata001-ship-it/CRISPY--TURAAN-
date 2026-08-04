"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAiAssistant } from "@/features/ai-assistant/ai-assistant-context";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function AiAssistantFab() {
  const t = useT();
  const pathname = usePathname();
  const { toggle, isOpen, enabled } = useAiAssistant();

  if (pathname.startsWith("/admin") || !enabled) return null;

  return (
    <motion.button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      aria-controls="ai-drawer"
      aria-label={t("ai.openAssistant")}
      className={cn(
        "ai-fab fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full",
        "bg-gradient-to-br from-turquoise to-turquoise-light text-warm-white",
        "shadow-premium border border-white/25",
        "bottom-24 end-4 md:bottom-6 md:end-6",
        "transition-transform hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise focus-visible:ring-offset-2",
        isOpen && "scale-90 opacity-80"
      )}
      whileTap={{ scale: 0.92 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: isOpen ? 0.9 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Sparkles className="h-6 w-6" strokeWidth={2.25} />
    </motion.button>
  );
}
