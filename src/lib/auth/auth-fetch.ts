"use client";

import { useAuth } from "@/components/providers/auth-provider";

export async function authFetch(
  getIdToken: () => Promise<string | null>,
  input: RequestInfo,
  init?: RequestInit
) {
  const token = await getIdToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export function useAuthFetch() {
  const { getIdToken } = useAuth();
  return (input: RequestInfo, init?: RequestInit) =>
    authFetch(getIdToken, input, init);
}
