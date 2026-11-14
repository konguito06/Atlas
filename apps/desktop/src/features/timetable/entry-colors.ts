import type { TimetableColor } from "@atlas/core";

/** How each palette colour looks on the grid and in the colour picker. */
export const ENTRY_COLORS: Record<
  TimetableColor,
  { name: string; block: string; swatch: string }
> = {
  blue: {
    name: "Blue",
    block:
      "border-blue-300 bg-blue-50 text-blue-950 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-900",
    swatch: "bg-blue-500",
  },
  green: {
    name: "Green",
    block:
      "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900",
    swatch: "bg-emerald-500",
  },
  amber: {
    name: "Amber",
    block:
      "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900",
    swatch: "bg-amber-500",
  },
  rose: {
    name: "Rose",
    block:
      "border-rose-300 bg-rose-50 text-rose-950 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100 dark:hover:bg-rose-900",
    swatch: "bg-rose-500",
  },
  violet: {
    name: "Violet",
    block:
      "border-violet-300 bg-violet-50 text-violet-950 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100 dark:hover:bg-violet-900",
    swatch: "bg-violet-500",
  },
  slate: {
    name: "Grey",
    block:
      "border-slate-300 bg-slate-50 text-slate-950 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    swatch: "bg-slate-500",
  },
};
