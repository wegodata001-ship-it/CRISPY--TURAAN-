"use client";

import { createContext, useContext, type ReactNode } from "react";

export type HostSurface = "portal" | "menu" | "public";

const HostSurfaceContext = createContext<HostSurface>("public");

export function HostSurfaceProvider({
  surface,
  children,
}: {
  surface: HostSurface;
  children: ReactNode;
}) {
  return (
    <HostSurfaceContext.Provider value={surface}>{children}</HostSurfaceContext.Provider>
  );
}

export function useHostSurface(): HostSurface {
  return useContext(HostSurfaceContext);
}
