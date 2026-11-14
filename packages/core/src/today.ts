import { type Deadline, groupDeadlines, toLocalDate } from "./deadlines";
import {
  type Timetable,
  type TimetableEntry,
  visibleEntries,
  type Weekday,
} from "./timetables";

/** The ISO weekday of a date where the person is: 1 Monday to 7 Sunday. */
export function isoWeekday(date: Date): Weekday {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as Weekday;
}

/** Minutes after midnight where the person is. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export interface TodayEntry {
  entry: TimetableEntry;
  timetableName: string;
  /** Relative to the current time. */
  status: "past" | "now" | "later";
}

/**
 * Today's entries from every timetable, earliest first. Entries a timetable
 * hides through its days and hours are left out here too.
 */
export function todaysEntries(
  timetables: Timetable[],
  entries: TimetableEntry[],
  now: Date,
): TodayEntry[] {
  const weekday = isoWeekday(now);
  const minute = minutesOfDay(now);

  return timetables
    .flatMap((timetable) =>
      visibleEntries(
        timetable,
        entries.filter((entry) => entry.timetableId === timetable.id),
      ).visible.map((entry) => ({ entry, timetableName: timetable.name })),
    )
    .filter(({ entry }) => entry.day === weekday)
    .sort(
      (a, b) =>
        a.entry.startMinute - b.entry.startMinute ||
        a.entry.endMinute - b.entry.endMinute,
    )
    .map(({ entry, timetableName }) => ({
      entry,
      timetableName,
      status:
        entry.endMinute <= minute
          ? "past"
          : entry.startMinute <= minute
            ? "now"
            : "later",
    }));
}

/** The whole hours a day's entries span, for drawing them on a line. */
export function daySpan(
  entries: TodayEntry[],
): { startHour: number; endHour: number } | null {
  if (entries.length === 0) {
    return null;
  }
  const starts = entries.map(({ entry }) => entry.startMinute);
  const ends = entries.map(({ entry }) => entry.endMinute);
  return {
    startHour: Math.floor(Math.min(...starts) / 60),
    endHour: Math.ceil(Math.max(...ends) / 60),
  };
}

/** "35 min", "1 h" or "2 h 10 min". */
export function describeMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** One sentence on where the day stands: what is on now, or what is next. */
export function describeNextUp(entries: TodayEntry[], now: Date): string {
  const minute = minutesOfDay(now);
  const current = entries.find((item) => item.status === "now");
  if (current) {
    const left = describeMinutes(current.entry.endMinute - minute);
    return `${current.entry.title} is on now, for another ${left}.`;
  }
  const next = entries.find((item) => item.status === "later");
  if (next) {
    const wait = describeMinutes(next.entry.startMinute - minute);
    return `${next.entry.title} starts in ${wait}.`;
  }
  return entries.length > 0
    ? "Everything on today's timetable is done."
    : "Nothing on your timetable today.";
}

/** Adds days to a YYYY-MM-DD date, in the person's calendar. */
export function addDays(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return toLocalDate(new Date(year, month - 1, day + days));
}

/**
 * The deadlines worth showing on a day's overview: everything overdue or
 * due today, plus what is due within the coming week.
 */
export function deadlinesDueSoon(
  deadlines: Deadline[],
  today: string,
): { overdue: Deadline[]; today: Deadline[]; thisWeek: Deadline[] } {
  const groups = groupDeadlines(deadlines, today);
  const horizon = addDays(today, 7);
  return {
    overdue: groups.overdue,
    today: groups.today,
    thisWeek: groups.upcoming.filter((deadline) => deadline.dueDate <= horizon),
  };
}
