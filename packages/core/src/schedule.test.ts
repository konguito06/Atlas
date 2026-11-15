import { describe, expect, test } from "vitest";
import type { CalendarEvent } from "./events";
import type { Exam } from "./exams";
import {
  datesInView,
  describeView,
  monthWeeks,
  scheduleDays,
  scheduleHours,
  stepDate,
  weekDates,
  weekdayOf,
} from "./schedule";
import { EMPTY_TASK_DRAFT, type Task } from "./tasks";
import type { Timetable, TimetableEntry } from "./timetables";

// Friday 13 November 2026.
const TODAY = "2026-11-13";

test("weekdayOf counts Monday as 1 and Sunday as 7", () => {
  expect(weekdayOf("2026-11-09")).toBe(1);
  expect(weekdayOf(TODAY)).toBe(5);
  expect(weekdayOf("2026-11-15")).toBe(7);
});

test("weekDates runs Monday to Sunday around a date", () => {
  expect(weekDates(TODAY)).toEqual([
    "2026-11-09",
    "2026-11-10",
    "2026-11-11",
    "2026-11-12",
    "2026-11-13",
    "2026-11-14",
    "2026-11-15",
  ]);
  expect(weekDates("2026-11-15")[0]).toBe("2026-11-09");
});

describe("monthWeeks", () => {
  test("covers the month in whole weeks, reaching into its neighbours", () => {
    const weeks = monthWeeks(TODAY);

    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[0]).toBe("2026-10-26");
    expect(weeks[5]?.[6]).toBe("2026-12-06");
  });

  test("a month that fits four weeks exactly gets four", () => {
    // February 2027 starts on a Monday and has 28 days.
    expect(monthWeeks("2027-02-10")).toHaveLength(4);
  });
});

test("datesInView gives one day, seven, or the whole month page", () => {
  expect(datesInView("day", TODAY)).toEqual([TODAY]);
  expect(datesInView("week", TODAY)).toHaveLength(7);
  expect(datesInView("month", TODAY)).toHaveLength(42);
});

test.each([
  ["day", TODAY, 1, "2026-11-14"],
  ["day", "2026-11-01", -1, "2026-10-31"],
  ["week", TODAY, 1, "2026-11-20"],
  ["week", TODAY, -1, "2026-11-06"],
  ["month", TODAY, 1, "2026-12-01"],
  ["month", TODAY, -1, "2026-10-01"],
  // From the 31st, the next month is still the very next one.
  ["month", "2027-01-31", 1, "2027-02-01"],
  ["month", "2026-12-15", 1, "2027-01-01"],
] as const)("stepDate(%s, %s, %i) is %s", (view, date, direction, expected) => {
  expect(stepDate(view, date, direction)).toBe(expected);
});

test.each([
  ["day", TODAY, "Friday 13 November"],
  ["week", TODAY, "9 – 15 November"],
  ["week", "2026-12-01", "30 Nov – 6 Dec"],
  ["month", TODAY, "November 2026"],
] as const)("describeView(%s, %s) is %s", (view, date, expected) => {
  expect(describeView(view, date)).toBe(expected);
});

const semester: Timetable = {
  id: "semester",
  name: "Semester 1",
  days: [1, 2, 3, 4, 5],
  startHour: 9,
  endHour: 17,
};

const entry = (
  title: string,
  day: TimetableEntry["day"],
  startMinute: number,
  endMinute: number,
): TimetableEntry => ({
  id: title,
  timetableId: "semester",
  title,
  day,
  startMinute,
  endMinute,
  location: "",
  color: "blue",
});

const event = (
  title: string,
  date: string,
  startMinute: number | null = null,
  endMinute: number | null = null,
): CalendarEvent => ({
  id: title,
  title,
  date,
  startMinute,
  endMinute,
  location: "",
  notes: "",
  color: "rose",
  createdAt: "2026-11-01T00:00:00.000Z",
});

const exam = (subject: string, date: string, time: string | null = null) =>
  ({
    id: subject,
    subject,
    date,
    time,
    location: "",
    notes: "",
    createdAt: "2026-11-01T00:00:00.000Z",
  }) satisfies Exam;

const task = (title: string, extra: Partial<Task> = {}) =>
  ({
    ...EMPTY_TASK_DRAFT,
    id: title,
    title,
    status: "todo",
    completedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    ...extra,
  }) satisfies Task;

describe("scheduleDays", () => {
  const sources = {
    timetables: [semester],
    entries: [
      entry("Databases", 5, 660, 750),
      entry("Networks", 5, 540, 630),
      entry("Monday class", 1, 540, 600),
      // Outside the timetable's days, so hidden everywhere.
      entry("Saturday club", 6, 600, 660),
    ],
    events: [
      event("Dentist", TODAY, 600, 645),
      event("Trip", TODAY),
      event("Next week", "2026-11-20", 600, 660),
    ],
    exams: [exam("Algorithms", TODAY, "14:00"), exam("Later", "2026-12-01")],
    tasks: [
      task("Essay", { dueDate: TODAY, dueTime: "23:59" }),
      task("Handed in", { dueDate: TODAY, status: "done" }),
      task("Step", { dueDate: TODAY, parentId: "Essay" }),
      task("No date"),
    ],
  };
  const [friday, saturday] = scheduleDays(
    [TODAY, "2026-11-14"],
    sources,
    TODAY,
  );

  test("puts timetable entries and timed events on the day, earliest first", () => {
    expect(friday?.timed.map((item) => `${item.kind}: ${item.title}`)).toEqual([
      "entry: Networks",
      "event: Dentist",
      "entry: Databases",
    ]);
  });

  test("lists whole-day events, exams and open tasks due that day", () => {
    expect(friday?.allDay.map((item) => `${item.kind}: ${item.title}`)).toEqual(
      ["event: Trip", "exam: Algorithms", "task: Essay"],
    );
  });

  test("marks today, and leaves out what a timetable hides", () => {
    expect(friday?.isToday).toBe(true);
    expect(saturday).toMatchObject({
      isToday: false,
      weekday: 6,
      timed: [],
      allDay: [],
    });
  });

  test("a timetable entry repeats on the same weekday of any week", () => {
    const [nextMonday] = scheduleDays(["2026-11-16"], sources, TODAY);

    expect(nextMonday?.timed.map((item) => item.title)).toEqual([
      "Monday class",
    ]);
  });
});

describe("scheduleHours", () => {
  test("is 08:00 to 18:00 when nothing needs more", () => {
    expect(scheduleHours([], [])).toEqual({ startHour: 8, endHour: 18 });
  });

  test("widens for a timetable and for anything timed", () => {
    const days = scheduleDays(
      [TODAY],
      {
        timetables: [],
        entries: [],
        events: [
          event("Run", TODAY, 390, 450),
          event("Film", TODAY, 1230, 1350),
        ],
        exams: [],
        tasks: [],
      },
      TODAY,
    );

    expect(scheduleHours(days, [])).toEqual({ startHour: 6, endHour: 23 });
    expect(scheduleHours([], [{ ...semester, endHour: 21 }])).toEqual({
      startHour: 8,
      endHour: 21,
    });
  });
});
