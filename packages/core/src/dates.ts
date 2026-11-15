/**
 * The interface is in English, so dates are written in English too instead
 * of following the device, which would mix languages on screen.
 */
export const DISPLAY_LOCALE = "en-GB";

/** The result of checking what a person typed. */
export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

/** Today's date where the person is, as YYYY-MM-DD. */
export function toLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Adds days to a YYYY-MM-DD date, in the person's calendar. */
export function addDays(date: string, days: number): string {
  const start = parseLocalDate(date);
  return toLocalDate(
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + days),
  );
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Whole days from one YYYY-MM-DD date to another; negative if it is earlier. */
export function daysBetween(from: string, to: string): number {
  // Rounding absorbs the hour gained or lost on a daylight-saving change.
  return Math.round(
    (parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / DAY_IN_MS,
  );
}

/** "Today", "Tomorrow", "Yesterday", or the date written out. */
export function describeDueDate(
  dueDate: string,
  today: string,
  locale: string = DISPLAY_LOCALE,
): string {
  const days = daysBetween(today, dueDate);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return formatLocalDate(dueDate, today, locale);
}

/** A date written out, "Thu 10 Dec"; the year is added when it is not this one. */
export function formatLocalDate(
  date: string,
  today: string,
  locale: string = DISPLAY_LOCALE,
): string {
  const day = parseLocalDate(date);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year:
      day.getFullYear() === parseLocalDate(today).getFullYear()
        ? undefined
        : "numeric",
  }).format(day);
}
