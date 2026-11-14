import { describe, expect, test } from "vitest";
import { addDays, describeDueDate, toLocalDate } from "./dates";

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

describe("addDays", () => {
  test("crosses month and year ends", () => {
    expect(addDays("2026-11-28", 7)).toBe("2026-12-05");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
