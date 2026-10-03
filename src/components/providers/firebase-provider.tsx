"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useT } from "@/components/providers/locale-provider";
import { testFirebaseConnection, isConnectionHealthy } from "@/services/connectionService";
import type { ConnectionTestResult } from "@/services/connectionService";

interface FirebaseContextValue {
  connected: boolean;
  loading: boolean;
  result: ConnectionTestResult | null;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  connected: false,
  loading: true,
  result: null,
});

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkConnection() {
      try {
        const testResult = await testFirebaseConnection();
        if (!mounted) return;
        setResult(testResult);
        const healthy = isConnectionHealthy(testResult);
        setConnected(healthy);
        if (!healthy) setShowError(true);
      } catch {
        if (mounted) {
          setConnected(false);
          setShowError(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkConnection();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <FirebaseContext.Provider value={{ connected, loading, result }}>
      {children}
      <AnimatePresence>
        {!loading && showError && !connected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-24 start-4 end-4 z-50 mx-auto max-w-lg md:bottom-6 md:start-auto md:end-6 lg:bottom-6"
          >
            <div className="flex items-start gap-3 rounded-2xl border border-beige-dark/40 bg-warm-white px-4 py-3 shadow-elevated">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-dark-brown">
                  {result?.error?.startsWith("Missing environment")
                    ? "Configuration Error"
                    : t("error.network")}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-coffee/70">
                  {result?.error?.startsWith("Missing environment")
                    ? result.error
                    : t("error.firebase")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowError(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-coffee/50 hover:bg-beige/60 hover:text-coffee"
                aria-label={t("error.firebaseDismiss")}
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
