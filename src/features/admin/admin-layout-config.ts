/** Admin shell layout tokens — single source for sidebar width & breakpoints */
export const ADMIN_SIDEBAR_WIDTH_PX = 280;

export const ADMIN_LAYOUT = {
  sidebarWidth: `${ADMIN_SIDEBAR_WIDTH_PX}px`,
  /** Desktop main column offset so content never sits under the fixed sidebar */
  contentOffset: "lg:ps-[280px]",
  /** Below lg: sidebar hidden; drawer overlay allowed */
  sidebarVisible: "hidden lg:flex",
  /** Drawer / overlay only below lg (mobile + tablet) */
  drawerOnly: "lg:hidden",
} as const;
