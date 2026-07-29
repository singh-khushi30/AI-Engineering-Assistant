/**
 * Shared surface / spacing classes for consistent UI polish.
 * Prefer these over one-off card class strings.
 */

export const surfaces = {
  /** Standard content card */
  card: "rounded-xl border border-slate-800/80 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 sm:p-6",
  /** Quieter inset panel */
  panel: "rounded-xl border border-slate-800/80 bg-zinc-950/40 p-5 sm:p-6",
  /** Interactive card with hover lift */
  cardInteractive:
    "rounded-xl border border-slate-800/80 bg-zinc-900/50 p-5 shadow-sm shadow-black/20 transition-[border-color,background-color,box-shadow,transform] duration-150 hover:border-slate-700 hover:bg-zinc-900/70 hover:shadow-md hover:shadow-black/30 sm:p-6",
  /** Soft alert / status banners */
  alertInfo:
    "rounded-xl border border-blue-900/40 bg-blue-950/20 p-5 sm:p-6",
  alertWarning:
    "rounded-xl border border-amber-900/40 bg-amber-950/20 p-5 sm:p-6",
  alertDanger:
    "rounded-xl border border-red-900/40 bg-red-950/20 p-5 sm:p-6",
  alertSuccess:
    "rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-5 sm:p-6",
} as const;

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export const pageStack = "space-y-6";
export const sectionStack = "space-y-4";

/** Icon size tokens */
export const iconSize = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
  xl: "size-6",
} as const;
