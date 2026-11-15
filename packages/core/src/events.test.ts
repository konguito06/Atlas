import { expect, test } from "vitest";
import { upcomingEvents, validateEvent } from "./events";

const draft = {
  title: " Dentist ",
  date: "2026-11-20",
  startMinute: 600,
  endMinute: 645,
  location: "",
  notes: "",
  color: "rose" as const,
};

test("accepts a timed event and trims its title", () => {
  expect(validateEvent(draft)).toEqual({
    ok: true,
    value: { ...draft, title: "Dentist" },
  });
});

test("accepts an event with no times, which takes the whole day", () => {
  expect(
    validateEvent({ ...draft, startMinute: null, endMinute: null }).ok,
  ).toBe(true);
});

test.each([
  [{ title: "  " }, "Give the event a title."],
  [{ date: "" }, "Pick the date of the event."],
  [{ endMinute: null }, "Give both a start and an end time, or neither."],
  [{ startMinute: null }, "Give both a start and an end time, or neither."],
  [{ endMinute: 600 }, "The end must be after the start."],
])("refuses %o", (change, message) => {
  expect(validateEvent({ ...draft, ...change })).toEqual({
    ok: false,
    message,
  });
});

test("upcomingEvents drops past events and runs soonest first", () => {
  const on = (title: string, date: string, startMinute: number | null) => ({
    ...draft,
    id: title,
    title,
    date,
    startMinute,
    endMinute: startMinute === null ? null : startMinute + 60,
    createdAt: "2026-11-01T00:00:00.000Z",
  });

  expect(
    upcomingEvents(
      [
        on("Later", "2026-11-20", 600),
        on("Afternoon", "2026-11-13", 840),
        on("Gone", "2026-11-12", 600),
        on("Whole day", "2026-11-13", null),
        on("Morning", "2026-11-13", 540),
      ],
      "2026-11-13",
    ).map((event) => event.title),
  ).toEqual(["Whole day", "Morning", "Afternoon", "Later"]);
});
