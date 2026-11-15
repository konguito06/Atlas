import type { Task, Timetable, TimetableEntry } from "@atlas/core";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  createFakeData,
  documentNamed,
  renderApp,
  taskNamed,
} from "@/test/fakes";

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

const deadline = (title: string, dueDate: string, extra: Partial<Task> = {}) =>
  taskNamed(title, { dueDate, ...extra });

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
    screen.getByRole("button", { name: "Home" }).getAttribute("aria-current"),
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
      tasks: [
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

test("a task can be ticked off from here", async () => {
  renderApp(createFakeData({ tasks: [deadline("Essay", "2026-11-13")] }));

  fireEvent.click(await screen.findByLabelText("Mark Essay as done"));

  expect(
    await screen.findByText("Nothing is due in the next week."),
  ).toBeDefined();
});

test("with nothing due, the button leads to adding a task", async () => {
  renderApp(createFakeData());

  fireEvent.click(await screen.findByRole("button", { name: "Add a task" }));

  expect(await screen.findByRole("heading", { name: "Tasks" })).toBeDefined();
});

test("the sidebar counts tasks that are due today or overdue", async () => {
  renderApp(
    createFakeData({
      tasks: [
        deadline("Library book", "2026-11-12"),
        deadline("Essay", "2026-11-13"),
        deadline("Lab report", "2026-11-16"),
      ],
    }),
  );

  expect(
    await screen.findByRole("button", {
      name: "Tasks & Exams, 2 due today or overdue",
    }),
  ).toBeDefined();
});

function panel(name: string) {
  return within(screen.getByRole("region", { name }));
}

test("shows the time and a greeting for the time of day", async () => {
  renderApp(createFakeData());

  expect(
    await screen.findByText(
      (_text, element) =>
        element?.tagName === "P" && element.textContent === "The time is 11:30",
    ),
  ).toBeDefined();
  expect(screen.getByText("Good morning")).toBeDefined();
});

test("sums up the day in figures and a progress ring", async () => {
  renderApp(
    createFakeData({
      timetables: [semester],
      // 90 minutes done, then 30 of the next 90: half of 240 with the last.
      entries: [
        entry("Networks", 540, 630),
        entry("Databases", 660, 750),
        entry("Weights", 1080, 1140),
      ],
      tasks: [
        deadline("Library book", "2026-11-12"),
        deadline("Essay", "2026-11-13"),
        deadline("Quiz", "2026-11-13"),
        deadline("Lab report", "2026-11-16"),
      ],
    }),
  );

  expect(
    await screen.findByRole("img", {
      name: "50% of today's timetable done",
    }),
  ).toBeDefined();
  const figures = panel("At a glance")
    .getAllByRole("definition")
    .map((figure) => figure.textContent);
  expect(figures).toEqual(["34 h", "1", "2", "1"]);
});

test("a free day shows an empty ring", async () => {
  renderApp(createFakeData({ timetables: [semester] }));

  expect(
    await screen.findByRole("img", { name: "Nothing on the timetable today" }),
  ).toBeDefined();
});

test("lays out the week with what each day holds", async () => {
  renderApp(
    createFakeData({
      timetables: [semester],
      entries: [
        entry("Networks", 540, 630),
        entry("Monday class", 540, 600, { day: 1 }),
      ],
      tasks: [deadline("Essay", "2026-11-13")],
    }),
  );

  await waitFor(() =>
    expect(
      within(screen.getByRole("list", { name: "This week" }))
        .getAllByRole("listitem")
        .map((day) => day.getAttribute("aria-label")),
    ).toEqual([
      "Monday 9: 1 entry, 1 h, nothing due",
      "Tuesday 10: nothing scheduled, nothing due",
      "Wednesday 11: nothing scheduled, nothing due",
      "Thursday 12: nothing scheduled, nothing due",
      "Friday 13: 1 entry, 1 h 30 min, 1 due",
      "Saturday 14: nothing scheduled, nothing due",
      "Sunday 15: nothing scheduled, nothing due",
    ]),
  );
  expect(
    screen
      .getByRole("listitem", { name: /^Friday 13/ })
      .getAttribute("aria-current"),
  ).toBe("date");
});

test("lists recent documents and opens the one that is clicked", async () => {
  renderApp(
    createFakeData({
      documents: [documentNamed("Trip plan"), documentNamed("Reading list")],
    }),
  );

  fireEvent.click(await screen.findByRole("button", { name: "Reading list" }));

  expect(
    ((await screen.findByLabelText("Document title")) as HTMLInputElement)
      .value,
  ).toBe("Reading list");
});

test("with no documents, says so and links to the documents page", async () => {
  renderApp(createFakeData());

  expect(await screen.findByText("No documents yet.")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "All documents" }));
  expect(
    await screen.findByRole("heading", { name: "No documents yet" }),
  ).toBeDefined();
});
