"use client";

import { useState, useEffect } from "react";
import type { Customer } from "@/types";
import { subscribeToCustomers } from "@/services/customerService";

export function useCustomers(search?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToCustomers(
      search,
      (data) => {
        setCustomers(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [search]);

  return { customers, loading, error };
}
