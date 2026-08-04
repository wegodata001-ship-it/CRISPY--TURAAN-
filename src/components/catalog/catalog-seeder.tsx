"use client";

import { useEffect, useRef } from "react";
import { useCategories } from "@/hooks/useProducts";

/** Attempts Firestore seed once when catalog DB is empty */
export function CatalogSeeder() {
  const { categories, loading } = useCategories();
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || attempted.current) return;
    if (categories.length > 0) return;

    attempted.current = true;
    fetch("/api/seed", { method: "POST" }).catch(() => {
      // Fallback: master-menu.ts serves catalog until Admin SDK is configured
    });
  }, [categories.length, loading]);

  return null;
}
