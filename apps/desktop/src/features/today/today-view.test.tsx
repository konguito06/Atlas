import type { Deadline, Timetable, TimetableEntry } from "@atlas/core";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createFakeData, renderApp } from "@/test/fakes";

// Pin the clock: Friday 13 November 2026, 11:30.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 13, 11, 30));
});
afterEach(() => {
  vi.useRealTimers();
});

const semester: Timetable = {
  id: "semester",
  name: "Semester 1",
  days: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 20,
};

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

function rowsIn(name: string) {
  const list = screen.queryByRole("list", { name });
  return list
    ? within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    : [];
}

test("opens on today, with the date as the heading", async () => {
  renderApp(createFakeData());

  expect(
    await screen.findByRole("heading", { name: "Friday, 13 November" }),
  ).toBeDefined();
  expect(
    screen.getByRole("button", { name: "Today" }).getAttribute("aria-current"),
  ).toBe("page");
});

test("lists today's entries in order and says what is on now", async () => {
  renderApp(
    createFakeData({
      timetables: [semester],
      entries: [
        entry("Weights", 1080, 1140),
        entry("Databases", 660, 750, { location: "Lab B" }),
        entry("Networks", 540, 630),
        entry("Monday class", 540, 600, { day: 1 }),
      ],
    }),
  );

  await waitFor(() =>
    expect(rowsIn("Today's timetable")).toEqual([
      "09:00–10:30Networks",
      "11:00–12:30DatabasesNowLab B",
      "18:00–19:00Weights",
    ]),
  );
  expect(
    screen.getByText("Databases is on now, for another 1 h."),
  ).toBeDefined();
});

test("without a timetable, offers to set one up and goes there", async () => {
  renderApp(createFakeData());

  fireEvent.click(
    await screen.findByRole("button", { name: "Set up a timetable" }),
  );

  expect(
    await screen.findByRole("heading", { name: "No timetable yet" }),
  ).toBeDefined();
});

test("a day with nothing on the timetable says so", async () => {
  renderApp(
    createFakeData({
      timetables: [semester],
      entries: [entry("Monday class", 540, 600, { day: 1 })],
    }),
  );

  expect(
    await screen.findByText("Nothing on your timetable today."),
  ).toBeDefined();
  expect(rowsIn("Today's timetable")).toEqual([]);
});

test("shows what is overdue, due today and due this week, and nothing later", async () => {
  renderApp(
    createFakeData({
      deadlines: [
        deadline("Next month", "2026-12-20"),
        deadline("Lab report", "2026-11-16"),
        deadline("Essay", "2026-11-13", { dueTime: "23:59" }),
        deadline("Library book", "2026-11-12"),
      ],
    }),
  );

  await waitFor(() =>
    expect(rowsIn("Due soon")).toEqual([
      "Library bookYesterday",
      "EssayToday at 23:59",
      "Lab reportMon 16 Nov",
    ]),
  );
});

test("a deadline can be ticked off from here", async () => {
  renderApp(createFakeData({ deadlines: [deadline("Essay", "2026-11-13")] }));

  fireEvent.click(await screen.findByLabelText("Mark Essay as done"));

  expect(
    await screen.findByText("Nothing is due in the next week."),
  ).toBeDefined();
});

test("with nothing due, the button leads to adding a deadline", async () => {
  renderApp(createFakeData());

  fireEvent.click(
    await screen.findByRole("button", { name: "Add a deadline" }),
  );

  expect(
    await screen.findByRole("heading", { name: "Deadlines" }),
  ).toBeDefined();
});

test("the sidebar counts deadlines that are due today or overdue", async () => {
  renderApp(
    createFakeData({
      deadlines: [
        deadline("Library book", "2026-11-12"),
        deadline("Essay", "2026-11-13"),
        deadline("Lab report", "2026-11-16"),
      ],
    }),
  );

  expect(
    await screen.findByRole("button", {
      name: "Deadlines, 2 due today or overdue",
    }),
  ).toBeDefined();
});
