"use client";

import { useState, useEffect } from "react";
import { useHideCustomerChrome } from "@/hooks/useAdminPath";
import { motion, AnimatePresence } from "framer-motion";
import { AppLoadingScreen } from "@/components/brand/app-loading-screen";

function shouldSkipSplash() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path.startsWith("/admin") || path.startsWith("/menu-display");
}

export function BrandSplash() {
  const hideChrome = useHideCustomerChrome();
  const [visible, setVisible] = useState(() => !shouldSkipSplash());

  useEffect(() => {
    if (hideChrome) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(timer);
  }, [hideChrome]);

  if (hideChrome) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[90]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            <AppLoadingScreen />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
