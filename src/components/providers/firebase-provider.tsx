"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkConnection() {
      try {
        const testResult = await testFirebaseConnection();
        if (!mounted) return;
        setResult(testResult);
        const healthy = isConnectionHealthy(testResult);
        setConnected(healthy);
        if (healthy) {
          setShowBadge(true);
          setTimeout(() => setShowBadge(false), 4000);
        }
      } catch {
        if (mounted) setConnected(false);
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
        {showBadge && connected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-6"
          >
            <div className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-elevated">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Firebase Connected
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!loading && !connected && result && !result.envValid && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 md:bottom-6">
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
            Missing Firebase env: {result.missingEnv.join(", ")}
          </div>
        </div>
      )}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
