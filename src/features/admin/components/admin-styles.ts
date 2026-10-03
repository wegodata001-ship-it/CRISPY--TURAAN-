import { cn } from "@/lib/utils";

/** Shared admin design tokens — single source for cards, buttons, inputs */
export const adminCard = cn(
  "rounded-2xl border border-beige-dark/15 bg-warm-white p-5 shadow-soft",
  "dark:border-white/10 dark:bg-[#1f1f1f]/90"
);

export const adminCardHover = cn(
  adminCard,
  "transition-all duration-200 hover:border-turquoise/30 hover:shadow-elevated"
);

export const adminKpiCard = cn(
  "rounded-2xl border border-beige-dark/15 bg-warm-white p-4 md:p-5 shadow-soft",
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated",
  "dark:border-white/10 dark:bg-[#1f1f1f]/90"
);

export const adminPageTitle = "font-display text-2xl font-bold text-dark-brown md:text-3xl dark:text-warm-white";
export const adminPageSubtitle = "mt-1 text-sm text-coffee/60 dark:text-warm-white/60";

export const adminInput = cn(
  "h-10 rounded-xl border-beige-dark/30 bg-beige/20",
  "dark:border-white/10 dark:bg-white/5"
);

export const adminBtnPrimary = "h-10 rounded-xl px-4 font-medium";
export const adminBtnOutline = "h-10 rounded-xl px-4 font-medium";

export const adminTableHeader = "bg-beige/40 text-xs font-semibold uppercase tracking-wide text-coffee/70 dark:bg-white/5 dark:text-warm-white/70";
export const adminTableRow = "border-b border-beige-dark/10 transition-colors hover:bg-beige/20 dark:border-white/5 dark:hover:bg-white/5";

export const adminBadge = "rounded-full px-2.5 py-0.5 text-[11px] font-medium";
