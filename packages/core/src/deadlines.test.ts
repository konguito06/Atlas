import { describe, expect, test } from "vitest";
import {
  type Deadline,
  describeDueDate,
  groupDeadlines,
  toLocalDate,
  validateDeadline,
} from "./deadlines";

function deadline(
  title: string,
  dueDate: string,
  extra: Partial<Deadline> = {},
): Deadline {
  return {
    id: title,
    title,
    dueDate,
    dueTime: null,
    completed: false,
    ...extra,
  };
}

const titles = (deadlines: Deadline[]) => deadlines.map((item) => item.title);

describe("groupDeadlines", () => {
  const today = "2026-11-13";

  test("splits open deadlines into overdue, today and upcoming", () => {
    const groups = groupDeadlines(
      [
        deadline("Next week", "2026-11-20"),
        deadline("Yesterday", "2026-11-12"),
        deadline("Due today", "2026-11-13"),
      ],
      today,
    );

    expect(titles(groups.overdue)).toEqual(["Yesterday"]);
    expect(titles(groups.today)).toEqual(["Due today"]);
    expect(titles(groups.upcoming)).toEqual(["Next week"]);
    expect(groups.done).toEqual([]);
  });

  test("keeps a deadline in today all day, even after its time has passed", () => {
    const groups = groupDeadlines(
      [deadline("Morning", today, { dueTime: "00:01" })],
      today,
    );

    expect(titles(groups.today)).toEqual(["Morning"]);
    expect(groups.overdue).toEqual([]);
  });

  test("orders by date, then time, with all-day deadlines last in their day", () => {
    const groups = groupDeadlines(
      [
        deadline("Later date", "2026-11-22"),
        deadline("All day", "2026-11-20"),
        deadline("Afternoon", "2026-11-20", { dueTime: "15:00" }),
        deadline("Morning", "2026-11-20", { dueTime: "09:00" }),
      ],
      today,
    );

    expect(titles(groups.upcoming)).toEqual([
      "Morning",
      "Afternoon",
      "All day",
      "Later date",
    ]);
  });

  test("moves completed deadlines to done, most recent first, whatever their date", () => {
    const groups = groupDeadlines(
      [
        deadline("Old", "2026-11-01", { completed: true }),
        deadline("Future", "2026-12-01", { completed: true }),
      ],
      today,
    );

    expect(titles(groups.done)).toEqual(["Future", "Old"]);
    expect(groups.overdue).toEqual([]);
    expect(groups.upcoming).toEqual([]);
  });
});

describe("describeDueDate", () => {
  const today = "2026-11-13";

  test.each([
    ["2026-11-13", "Today"],
    ["2026-11-14", "Tomorrow"],
    ["2026-11-12", "Yesterday"],
    ["2026-11-20", "Fri 20 Nov"],
    ["2027-01-04", "Mon, 4 Jan 2027"],
  ])("describes %s as %s", (dueDate, expected) => {
    expect(describeDueDate(dueDate, today, "en-GB")).toBe(expected);
  });

  test("still says tomorrow across a daylight-saving change", () => {
    expect(describeDueDate("2026-03-29", "2026-03-28", "en-GB")).toBe(
      "Tomorrow",
    );
  });
});

describe("toLocalDate", () => {
  test("writes the local calendar date with leading zeros", () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("validateDeadline", () => {
  test("accepts a title and date, trimming the title", () => {
    expect(
      validateDeadline({
        title: "  Essay ",
        dueDate: "2026-12-01",
        dueTime: null,
      }),
    ).toEqual({
      ok: true,
      value: { title: "Essay", dueDate: "2026-12-01", dueTime: null },
    });
  });

  test.each([
    [
      { title: "  ", dueDate: "2026-12-01", dueTime: null },
      "Give the deadline a title.",
    ],
    [{ title: "Essay", dueDate: "", dueTime: null }, "Pick a date."],
    [{ title: "Essay", dueDate: "2026-02-30", dueTime: null }, "Pick a date."],
    [
      { title: "Essay", dueDate: "2026-12-01", dueTime: "25:00" },
      "Enter the time as hours and minutes.",
    ],
    [
      { title: "x".repeat(201), dueDate: "2026-12-01", dueTime: null },
      "Keep the title under 200 characters.",
    ],
  ])("explains what is wrong with %j", (draft, message) => {
    expect(validateDeadline(draft)).toEqual({ ok: false, message });
  });
});
