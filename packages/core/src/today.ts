import { addDays, toLocalDate } from "./dates";
import type { Task } from "./tasks";
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

/** "Good morning", "Good afternoon" or "Good evening", by the clock. */
export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * How far through today's timetable the day is, counted in scheduled
 * minutes, so a long class weighs more than a short one.
 */
export function dayProgress(
  entries: TodayEntry[],
  now: Date,
): { doneMinutes: number; totalMinutes: number; fraction: number } {
  const minute = minutesOfDay(now);
  let doneMinutes = 0;
  let totalMinutes = 0;
  for (const { entry } of entries) {
    const length = entry.endMinute - entry.startMinute;
    totalMinutes += length;
    doneMinutes += Math.min(Math.max(minute - entry.startMinute, 0), length);
  }
  return {
    doneMinutes,
    totalMinutes,
    fraction: totalMinutes === 0 ? 0 : doneMinutes / totalMinutes,
  };
}

export interface WeekDay {
  /** YYYY-MM-DD. */
  date: string;
  weekday: Weekday;
  isToday: boolean;
  /** Timetable entries on that weekday, and how long they run in total. */
  entryCount: number;
  scheduledMinutes: number;
  /** Tasks due that day that are not done yet. */
  dueCount: number;
}

/** The current week, Monday to Sunday, with what each day holds. */
export function weekOverview(
  timetables: Timetable[],
  entries: TimetableEntry[],
  tasks: Task[],
  now: Date,
): WeekDay[] {
  const today = toLocalDate(now);
  const monday = addDays(today, 1 - isoWeekday(now));
  const shown = timetables.flatMap(
    (timetable) =>
      visibleEntries(
        timetable,
        entries.filter((entry) => entry.timetableId === timetable.id),
      ).visible,
  );

  return ([1, 2, 3, 4, 5, 6, 7] as const).map((weekday) => {
    const date = addDays(monday, weekday - 1);
    const onDay = shown.filter((entry) => entry.day === weekday);
    return {
      date,
      weekday,
      isToday: date === today,
      entryCount: onDay.length,
      scheduledMinutes: onDay.reduce(
        (total, entry) => total + entry.endMinute - entry.startMinute,
        0,
      ),
      dueCount: tasks.filter(
        (task) =>
          task.parentId === null &&
          task.status !== "done" &&
          task.dueDate === date,
      ).length,
    };
  });
}
