import { describe, expect, test } from "vitest";
import {
  layoutDay,
  minutesToTime,
  type TimetableEntry,
  type TimetableEntryDraft,
  timeToMinutes,
  validateTimetable,
  validateTimetableEntry,
  visibleEntries,
  weekdayName,
} from "./timetables";

function entry(
  title: string,
  start: string,
  end: string,
  extra: Partial<TimetableEntry> = {},
): TimetableEntry {
  return {
    id: title,
    timetableId: "timetable-1",
    title,
    day: 1,
    startMinute: timeToMinutes(start) ?? 0,
    endMinute: timeToMinutes(end) ?? 0,
    location: "",
    color: "blue",
    ...extra,
  };
}

describe("clock times", () => {
  test.each([
    [0, "00:00"],
    [570, "09:30"],
    [1439, "23:59"],
  ])("%i minutes is %s, and back", (minutes, time) => {
    expect(minutesToTime(minutes)).toBe(time);
    expect(timeToMinutes(time)).toBe(minutes);
  });

  test.each(["", "9:30", "24:00", "12:60", "noon"])(
    "%j is not a clock time",
    (value) => {
      expect(timeToMinutes(value)).toBeNull();
    },
  );
});

describe("weekdayName", () => {
  test("names days from Monday (1) to Sunday (7)", () => {
    expect(weekdayName(1, "long", "en-GB")).toBe("Monday");
    expect(weekdayName(7, "short", "en-GB")).toBe("Sun");
  });
});

describe("layoutDay", () => {
  const placement = (entries: TimetableEntry[]) =>
    layoutDay(entries).map((placed) => [
      placed.entry.title,
      placed.lane,
      placed.lanes,
    ]);

  test("gives entries that do not overlap the full width", () => {
    expect(
      placement([
        entry("Maths", "09:00", "10:00"),
        entry("Art", "10:00", "11:00"),
      ]),
    ).toEqual([
      ["Maths", 0, 1],
      ["Art", 0, 1],
    ]);
  });

  test("puts two overlapping entries side by side", () => {
    expect(
      placement([
        entry("Maths", "09:00", "10:30"),
        entry("Art", "10:00", "11:00"),
      ]),
    ).toEqual([
      ["Maths", 0, 2],
      ["Art", 1, 2],
    ]);
  });

  test("reuses a slot once the entry in it has ended", () => {
    expect(
      placement([
        entry("Long", "09:00", "12:00"),
        entry("Early", "09:00", "10:00"),
        entry("Late", "10:00", "11:00"),
      ]),
    ).toEqual([
      ["Early", 0, 2],
      ["Long", 1, 2],
      ["Late", 0, 2],
    ]);
  });

  test("lays out separate groups independently", () => {
    expect(
      placement([
        entry("A", "09:00", "10:00"),
        entry("B", "09:30", "10:30"),
        entry("C", "14:00", "15:00"),
      ]),
    ).toEqual([
      ["A", 0, 2],
      ["B", 1, 2],
      ["C", 0, 1],
    ]);
  });
});

describe("visibleEntries", () => {
  const timetable = {
    name: "Week",
    days: [1, 2] as const,
    startHour: 9,
    endHour: 17,
  };

  test("counts entries the days and hours hide completely", () => {
    const result = visibleEntries({ ...timetable, days: [...timetable.days] }, [
      entry("Shown", "10:00", "11:00"),
      entry("Starts early", "08:00", "09:30"),
      entry("Too early", "07:00", "09:00"),
      entry("Too late", "17:00", "18:00"),
      entry("Weekend", "10:00", "11:00", { day: 6 }),
    ]);

    expect(result.visible.map((item) => item.title)).toEqual([
      "Shown",
      "Starts early",
    ]);
    expect(result.hiddenCount).toBe(3);
  });
});

describe("validateTimetable", () => {
  test("trims the name and puts the days in week order without repeats", () => {
    expect(
      validateTimetable({
        name: " Semester 1 ",
        days: [3, 1, 3],
        startHour: 8,
        endHour: 18,
      }),
    ).toEqual({
      ok: true,
      value: { name: "Semester 1", days: [1, 3], startHour: 8, endHour: 18 },
    });
  });

  test.each([
    [
      { name: "", days: [1], startHour: 8, endHour: 18 },
      "Give the timetable a name.",
    ],
    [
      { name: "Week", days: [], startHour: 8, endHour: 18 },
      "Show at least one day.",
    ],
    [
      { name: "Week", days: [1], startHour: 18, endHour: 8 },
      "The last hour must be after the first hour.",
    ],
  ] as const)("explains what is wrong with %j", (settings, message) => {
    expect(
      validateTimetable({ ...settings, days: [...settings.days] }),
    ).toEqual({ ok: false, message });
  });
});

describe("validateTimetableEntry", () => {
  const draft: TimetableEntryDraft = {
    title: "Algorithms",
    day: 1,
    startMinute: 540,
    endMinute: 630,
    location: "Room 2.1",
    color: "green",
  };

  test("accepts a complete entry", () => {
    expect(validateTimetableEntry(draft)).toEqual({ ok: true, value: draft });
  });

  test.each([
    [{ title: "  " }, "Give the entry a title."],
    [
      { startMinute: 630, endMinute: 540 },
      "The end time must be after the start time.",
    ],
    [
      { startMinute: 540, endMinute: 540 },
      "The end time must be after the start time.",
    ],
    [{ location: "x".repeat(101) }, "Keep the location under 100 characters."],
  ])("explains what is wrong with %j", (change, message) => {
    expect(validateTimetableEntry({ ...draft, ...change })).toEqual({
      ok: false,
      message,
    });
  });
});
