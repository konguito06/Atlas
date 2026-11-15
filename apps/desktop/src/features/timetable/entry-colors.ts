import type { TimetableColor } from "@atlas/core";

/**
 * How each colour a user can pick looks on the grid and in the picker. The
 * blocks are a thin wash of the colour over whatever is behind them, so one
 * definition works on the light and the dark theme.
 */
export const ENTRY_COLORS: Record<
  TimetableColor,
  { name: string; block: string; swatch: string }
> = {
  blue: {
    name: "Blue",
    block:
      "border-sky-600/30 bg-sky-600/15 text-foreground hover:bg-sky-600/25 dark:border-sky-400/35 dark:bg-sky-400/20 dark:hover:bg-sky-400/30",
    swatch: "bg-sky-600 dark:bg-sky-400",
  },
  green: {
    name: "Green",
    block:
      "border-emerald-600/30 bg-emerald-600/15 text-foreground hover:bg-emerald-600/25 dark:border-emerald-400/35 dark:bg-emerald-400/20 dark:hover:bg-emerald-400/30",
    swatch: "bg-emerald-600 dark:bg-emerald-400",
  },
  amber: {
    name: "Amber",
    block:
      "border-amber-600/30 bg-amber-600/15 text-foreground hover:bg-amber-600/25 dark:border-amber-400/35 dark:bg-amber-400/20 dark:hover:bg-amber-400/30",
    swatch: "bg-amber-600 dark:bg-amber-400",
  },
  rose: {
    name: "Rose",
    block:
      "border-rose-600/30 bg-rose-600/15 text-foreground hover:bg-rose-600/25 dark:border-rose-400/35 dark:bg-rose-400/20 dark:hover:bg-rose-400/30",
    swatch: "bg-rose-600 dark:bg-rose-400",
  },
  violet: {
    name: "Violet",
    block:
      "border-violet-600/30 bg-violet-600/15 text-foreground hover:bg-violet-600/25 dark:border-violet-400/35 dark:bg-violet-400/20 dark:hover:bg-violet-400/30",
    swatch: "bg-violet-600 dark:bg-violet-400",
  },
  slate: {
    name: "Grey",
    block:
      "border-slate-600/30 bg-slate-600/15 text-foreground hover:bg-slate-600/25 dark:border-slate-400/35 dark:bg-slate-400/20 dark:hover:bg-slate-400/30",
    swatch: "bg-slate-600 dark:bg-slate-400",
  },
};
