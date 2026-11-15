import { describe, expect, test } from "vitest";
import { EMPTY_TASK_DRAFT, type Task } from "./tasks";
import type { Timetable, TimetableEntry } from "./timetables";
import {
  dayProgress,
  daySpan,
  describeMinutes,
  describeNextUp,
  greeting,
  isoWeekday,
  projectProgress,
  todaysEntries,
  weekOverview,
} from "./today";

// Friday 13 November 2026, at the given local time.
const at = (hours: number, minutes = 0) =>
  new Date(2026, 10, 13, hours, minutes);

const semester: Timetable = {
  id: "semester",
  name: "Semester 1",
  days: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 18,
};
const gym: Timetable = { ...semester, id: "gym", name: "Gym", endHour: 22 };

function entry(
  title: string,
  startMinute: number,
  endMinute: number,
  extra: Partial<TimetableEntry> = {},
): TimetableEntry {
  return {
    id: title,
    timetableId: "semester",
    title,
    day: 5,
    startMinute,
    endMinute,
    location: "",
    color: "blue",
    ...extra,
  };
}

const friday = [
  entry("Networks", 540, 630),
  entry("Databases", 660, 750),
  entry("Weights", 1080, 1140, { timetableId: "gym" }),
];
const summary = (now: Date, entries = friday) =>
  todaysEntries([semester, gym], entries, now).map((item) => [
    item.entry.title,
    item.status,
  ]);

describe("isoWeekday", () => {
  test("counts Monday as 1 and Sunday as 7", () => {
    expect(isoWeekday(new Date(2026, 10, 9))).toBe(1);
    expect(isoWeekday(new Date(2026, 10, 15))).toBe(7);
  });
});

describe("todaysEntries", () => {
  test("lists today's entries from every timetable, earliest first, with their timetable", () => {
    const entries = todaysEntries(
      [semester, gym],
      [...friday].reverse(),
      at(7),
    );

    expect(
      entries.map((item) => [item.entry.title, item.timetableName]),
    ).toEqual([
      ["Networks", "Semester 1"],
      ["Databases", "Semester 1"],
      ["Weights", "Gym"],
    ]);
  });

  test("marks each entry as past, on now or later", () => {
    expect(summary(at(11, 30))).toEqual([
      ["Networks", "past"],
      ["Databases", "now"],
      ["Weights", "later"],
    ]);
  });

  test("treats an entry as past from the minute it ends", () => {
    expect(summary(at(10, 30))[0]).toEqual(["Networks", "past"]);
    expect(summary(at(10, 29))[0]).toEqual(["Networks", "now"]);
  });

  test("leaves out other days and entries their timetable hides", () => {
    expect(
      summary(at(7), [
        entry("Monday class", 540, 600, { day: 1 }),
        entry("Before the grid starts", 360, 420),
        entry("Networks", 540, 630),
      ]),
    ).toEqual([["Networks", "later"]]);
  });
});

describe("daySpan", () => {
  test("covers the whole hours from the first start to the last end", () => {
    const entries = todaysEntries([semester, gym], friday, at(7));

    expect(daySpan(entries)).toEqual({ startHour: 9, endHour: 19 });
  });

  test("rounds outwards for entries that start or end mid-hour", () => {
    const entries = todaysEntries([semester], [entry("Lab", 570, 645)], at(7));

    expect(daySpan(entries)).toEqual({ startHour: 9, endHour: 11 });
  });

  test("is nothing on an empty day", () => {
    expect(daySpan([])).toBeNull();
  });
});

describe("describeMinutes", () => {
  test.each([
    [35, "35 min"],
    [60, "1 h"],
    [130, "2 h 10 min"],
  ])("writes %i minutes as %s", (minutes, text) => {
    expect(describeMinutes(minutes)).toBe(text);
  });
});

describe("describeNextUp", () => {
  const sentence = (now: Date, entries = friday) =>
    describeNextUp(todaysEntries([semester, gym], entries, now), now);

  test("says what is on now and for how long", () => {
    expect(sentence(at(11, 30))).toBe("Databases is on now, for another 1 h.");
  });

  test("otherwise says what starts next and when", () => {
    expect(sentence(at(8, 25))).toBe("Networks starts in 35 min.");
  });

  test("says so when the day's entries are over", () => {
    expect(sentence(at(20))).toBe("Everything on today's timetable is done.");
  });

  test("says so when there is nothing today", () => {
    expect(sentence(at(9), [])).toBe("Nothing on your timetable today.");
  });
});

describe("greeting", () => {
  test.each([
    [5, "Good morning"],
    [11, "Good morning"],
    [12, "Good afternoon"],
    [17, "Good afternoon"],
    [18, "Good evening"],
    [2, "Good evening"],
  ])("at %i o'clock says %s", (hour, text) => {
    expect(greeting(at(hour))).toBe(text);
  });
});

describe("dayProgress", () => {
  const progress = (now: Date) =>
    dayProgress(todaysEntries([semester, gym], friday, now), now);

  test("is nothing before the first entry and everything after the last", () => {
    expect(progress(at(7)).fraction).toBe(0);
    expect(progress(at(22)).fraction).toBe(1);
  });

  test("counts finished entries and the part of the current one already past", () => {
    // Networks (90 min) is over; Databases (90 min) is 30 minutes in.
    expect(progress(at(11, 30))).toEqual({
      doneMinutes: 120,
      totalMinutes: 240,
      fraction: 0.5,
    });
  });

  test("is zero on a day with no entries", () => {
    expect(dayProgress([], at(12))).toEqual({
      doneMinutes: 0,
      totalMinutes: 0,
      fraction: 0,
    });
  });
});

describe("weekOverview", () => {
  const due = (title: string, dueDate: string, extra: Partial<Task> = {}) =>
    ({
      ...EMPTY_TASK_DRAFT,
      id: title,
      title,
      dueDate,
      status: "todo",
      completedAt: null,
      createdAt: "2026-11-01T00:00:00.000Z",
      ...extra,
    }) satisfies Task;

  const week = weekOverview(
    [semester, gym],
    [...friday, entry("Monday class", 540, 600, { day: 1 })],
    [
      due("Essay", "2026-11-13"),
      due("Quiz", "2026-11-13"),
      due("Done one", "2026-11-13", { status: "done" }),
      due("A subtask", "2026-11-13", { parentId: "Essay" }),
      due("Next week", "2026-11-16"),
    ],
    at(11, 30),
  );

  test("runs Monday to Sunday of the current week and marks today", () => {
    expect(week.map((day) => day.date)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
    expect(week.filter((day) => day.isToday).map((day) => day.weekday)).toEqual(
      [5],
    );
  });

  test("counts each day's entries, their length and its open deadlines", () => {
    expect(week[0]).toMatchObject({ entryCount: 1, scheduledMinutes: 60 });
    expect(week[4]).toMatchObject({
      entryCount: 3,
      scheduledMinutes: 240,
      dueCount: 2,
    });
    expect(week[5]).toMatchObject({ entryCount: 0, dueCount: 0 });
  });
});

describe("projectProgress", () => {
  const task = (
    id: string,
    projectId: string | null,
    extra: Partial<Task> = {},
  ) =>
    ({
      ...EMPTY_TASK_DRAFT,
      id,
      title: id,
      projectId,
      status: "todo",
      completedAt: null,
      createdAt: "2026-11-01T00:00:00.000Z",
      ...extra,
    }) satisfies Task;
  const thesis = { id: "thesis", name: "Thesis", color: "violet" } as const;
  const move = { id: "move", name: "Moving flat", color: "amber" } as const;
  const done = { id: "done", name: "Finished", color: "green" } as const;
  const empty = { id: "empty", name: "Empty", color: "slate" } as const;

  const progress = projectProgress(
    [done, empty, thesis, move],
    [
      task("a", "thesis", { status: "done" }),
      task("b", "thesis"),
      task("b1", "thesis", { parentId: "b" }),
      task("c", "move"),
      task("d", "move"),
      task("e", "done", { status: "done" }),
      task("f", null),
    ],
  );

  test("counts top-level tasks only", () => {
    expect(progress.find((entry) => entry.project.id === "thesis")).toEqual({
      project: thesis,
      total: 2,
      done: 1,
    });
  });

  test("puts projects with open work first, least finished at the top", () => {
    expect(progress.map((entry) => entry.project.name)).toEqual([
      "Moving flat",
      "Thesis",
      "Empty",
      "Finished",
    ]);
  });
});
