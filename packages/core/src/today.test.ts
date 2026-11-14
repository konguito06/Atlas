import { describe, expect, test } from "vitest";
import type { Deadline } from "./deadlines";
import type { Timetable, TimetableEntry } from "./timetables";
import {
  addDays,
  daySpan,
  deadlinesDueSoon,
  describeMinutes,
  describeNextUp,
  isoWeekday,
  todaysEntries,
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

describe("addDays", () => {
  test("crosses month and year ends", () => {
    expect(addDays("2026-11-28", 7)).toBe("2026-12-05");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("deadlinesDueSoon", () => {
  const deadline = (title: string, dueDate: string, completed = false) =>
    ({ id: title, title, dueDate, dueTime: null, completed }) as Deadline;

  test("keeps overdue, today and the coming week, and drops the rest", () => {
    const soon = deadlinesDueSoon(
      [
        deadline("Late", "2026-11-10"),
        deadline("Today", "2026-11-13"),
        deadline("In a week", "2026-11-20"),
        deadline("In eight days", "2026-11-21"),
        deadline("Done already", "2026-11-13", true),
      ],
      "2026-11-13",
    );

    expect(soon.overdue.map((item) => item.title)).toEqual(["Late"]);
    expect(soon.today.map((item) => item.title)).toEqual(["Today"]);
    expect(soon.thisWeek.map((item) => item.title)).toEqual(["In a week"]);
  });
});
