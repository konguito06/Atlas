import { addDays, DISPLAY_LOCALE, parseLocalDate, toLocalDate } from "./dates";
import type { CalendarEvent } from "./events";
import type { Exam } from "./exams";
import type { Task } from "./tasks";
import {
  type Timetable,
  type TimetableColor,
  type TimetableEntry,
  visibleEntries,
  type Weekday,
} from "./timetables";

// The schedule is not stored anywhere. It is worked out for the dates on
// screen from what is stored: timetables (which repeat weekly), events,
// exams and task due dates.

export const SCHEDULE_VIEWS = ["day", "week", "month"] as const;
export type ScheduleView = (typeof SCHEDULE_VIEWS)[number];

/** The ISO weekday of a YYYY-MM-DD date: 1 is Monday, 7 is Sunday. */
export function weekdayOf(date: string): Weekday {
  return (parseLocalDate(date).getDay() || 7) as Weekday;
}

/** The Monday-to-Sunday week that holds a date. */
export function weekDates(date: string): string[] {
  const monday = addDays(date, 1 - weekdayOf(date));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/**
 * The whole weeks that cover a date's month, as a calendar page shows them.
 * The first and last week may reach into the neighbouring months.
 */
export function monthWeeks(date: string): string[][] {
  const first = `${date.slice(0, 8)}01`;
  const month = date.slice(0, 7);
  const weeks: string[][] = [];
  let week = weekDates(first);
  while (week.some((day) => day.startsWith(month))) {
    weeks.push(week);
    week = weekDates(addDays(week[0] ?? first, 7));
  }
  return weeks;
}

/** The dates a view shows when it is opened on a date. */
export function datesInView(view: ScheduleView, date: string): string[] {
  if (view === "day") return [date];
  if (view === "week") return weekDates(date);
  return monthWeeks(date).flat();
}

/** The date a view lands on when stepping back (-1) or forward (1). */
export function stepDate(
  view: ScheduleView,
  date: string,
  direction: -1 | 1,
): string {
  if (view === "day") return addDays(date, direction);
  if (view === "week") return addDays(date, 7 * direction);
  const current = parseLocalDate(date);
  // The first of the month, so a 31st never skips a shorter month.
  return toLocalDate(
    new Date(current.getFullYear(), current.getMonth() + direction, 1),
  );
}

/** What a view is showing, in words: a day, a span of days, or a month. */
export function describeView(
  view: ScheduleView,
  date: string,
  locale: string = DISPLAY_LOCALE,
): string {
  const format = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(parseLocalDate(value));

  if (view === "day") {
    return format(date, { weekday: "long", day: "numeric", month: "long" });
  }
  if (view === "month") return format(date, { month: "long", year: "numeric" });

  const week = weekDates(date);
  const first = week[0] ?? date;
  const last = week[6] ?? date;
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return sameMonth
    ? `${Number(first.slice(8))} – ${format(last, { day: "numeric", month: "long" })}`
    : `${format(first, { day: "numeric", month: "short" })} – ${format(last, { day: "numeric", month: "short" })}`;
}

/** Something with a start and an end on a day. */
export type TimedItem = {
  id: string;
  title: string;
  startMinute: number;
  endMinute: number;
  location: string;
  color: TimetableColor;
} & (
  | { kind: "entry"; entry: TimetableEntry; timetableName: string }
  | { kind: "event"; event: CalendarEvent }
);

/** Something that belongs to a day as a whole. */
export type DayItem =
  | { kind: "event"; id: string; title: string; event: CalendarEvent }
  | { kind: "exam"; id: string; title: string; time: string | null; exam: Exam }
  | {
      kind: "task";
      id: string;
      title: string;
      time: string | null;
      task: Task;
    };

export interface ScheduleDay {
  date: string;
  weekday: Weekday;
  isToday: boolean;
  /** Earliest first. */
  timed: TimedItem[];
  /** Whole-day events, then exams, then tasks that are due. */
  allDay: DayItem[];
}

export interface ScheduleSources {
  timetables: Timetable[];
  entries: TimetableEntry[];
  events: CalendarEvent[];
  exams: Exam[];
  tasks: Task[];
}

/**
 * What each of the given dates holds. Timetable entries appear on every
 * date with their weekday; entries a timetable hides through its days and
 * hours are left out, as they are everywhere else. Finished tasks and
 * subtasks are left out.
 */
export function scheduleDays(
  dates: string[],
  { timetables, entries, events, exams, tasks }: ScheduleSources,
  today: string,
): ScheduleDay[] {
  const weekly = timetables.flatMap((timetable) =>
    visibleEntries(
      timetable,
      entries.filter((entry) => entry.timetableId === timetable.id),
    ).visible.map((entry) => ({ entry, timetableName: timetable.name })),
  );

  return dates.map((date) => {
    const weekday = weekdayOf(date);
    const onDate = events.filter((event) => event.date === date);
    const timed: TimedItem[] = [
      ...weekly
        .filter(({ entry }) => entry.day === weekday)
        .map(
          ({ entry, timetableName }): TimedItem => ({
            kind: "entry",
            id: entry.id,
            title: entry.title,
            startMinute: entry.startMinute,
            endMinute: entry.endMinute,
            location: entry.location,
            color: entry.color,
            entry,
            timetableName,
          }),
        ),
      ...onDate.flatMap((event): TimedItem[] =>
        event.startMinute === null || event.endMinute === null
          ? []
          : [
              {
                kind: "event",
                id: event.id,
                title: event.title,
                startMinute: event.startMinute,
                endMinute: event.endMinute,
                location: event.location,
                color: event.color,
                event,
              },
            ],
      ),
    ].sort(
      (a, b) =>
        a.startMinute - b.startMinute ||
        a.endMinute - b.endMinute ||
        a.title.localeCompare(b.title),
    );

    const allDay: DayItem[] = [
      ...onDate
        .filter((event) => event.startMinute === null)
        .map(
          (event): DayItem => ({
            kind: "event",
            id: event.id,
            title: event.title,
            event,
          }),
        ),
      ...exams
        .filter((exam) => exam.date === date)
        .map(
          (exam): DayItem => ({
            kind: "exam",
            id: exam.id,
            title: exam.subject,
            time: exam.time,
            exam,
          }),
        ),
      ...tasks
        .filter(
          (task) =>
            task.dueDate === date &&
            task.parentId === null &&
            task.status !== "done",
        )
        .map(
          (task): DayItem => ({
            kind: "task",
            id: task.id,
            title: task.title,
            time: task.dueTime,
            task,
          }),
        ),
    ];

    return { date, weekday, isToday: date === today, timed, allDay };
  });
}

/**
 * The whole hours a time grid needs to show these days: wide enough for
 * every timetable and everything timed, and never less than 08:00 to 18:00.
 */
export function scheduleHours(
  days: ScheduleDay[],
  timetables: Timetable[],
): { startHour: number; endHour: number } {
  const timed = days.flatMap((day) => day.timed);
  return {
    startHour: Math.min(
      8,
      ...timetables.map((timetable) => timetable.startHour),
      ...timed.map((item) => Math.floor(item.startMinute / 60)),
    ),
    endHour: Math.max(
      18,
      ...timetables.map((timetable) => timetable.endHour),
      ...timed.map((item) => Math.ceil(item.endMinute / 60)),
    ),
  };
}
