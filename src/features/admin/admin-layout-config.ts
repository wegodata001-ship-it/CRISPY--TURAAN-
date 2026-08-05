/** Admin shell layout tokens — single source for sidebar width & breakpoints */
export const ADMIN_SIDEBAR_WIDTH_PX = 280;

export const ADMIN_LAYOUT = {
  sidebarWidth: `${ADMIN_SIDEBAR_WIDTH_PX}px`,
  /** Desktop: permanent sidebar column | Main content */
  grid: `lg:grid lg:min-h-screen lg:grid-cols-[${ADMIN_SIDEBAR_WIDTH_PX}px_minmax(0,1fr)]`,
  /** Below lg: sidebar hidden; drawer overlay allowed */
  sidebarVisible: "hidden lg:flex",
  /** Drawer / overlay only below lg (mobile + tablet) */
  drawerOnly: "lg:hidden",
} as const;
