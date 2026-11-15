import type { Timetable, TimetableEntry } from "@atlas/core";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  createFakeData,
  eventNamed,
  examNamed,
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
  endHour: 18,
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

async function openCalendar(seed: Parameters<typeof createFakeData>[0] = {}) {
  renderApp(createFakeData(seed));
  fireEvent.click(await screen.findByRole("button", { name: "Schedule" }));
  await screen.findByRole("heading", { level: 1 });
}

function rowsIn(name: string) {
  const list = screen.queryByRole("list", { name });
  return list
    ? within(list)
        .queryAllByRole("listitem")
        .map((item) => item.textContent)
    : [];
}

const heading = () => screen.getByRole("heading", { level: 1 }).textContent;

function fill(label: string, value: string) {
  fireEvent.change(within(screen.getByRole("dialog")).getByLabelText(label), {
    target: { value },
  });
}

const inDialog = () => within(screen.getByRole("dialog"));

test("opens on this week, with the timetable and events placed on their days", async () => {
  await openCalendar({
    timetables: [semester],
    entries: [
      entry("Networks", 5, 540, 630),
      entry("Monday class", 1, 540, 600),
    ],
    events: [
      eventNamed("Dentist", "2026-11-13", 600, 645, { location: "Clinic" }),
      eventNamed("Next week", "2026-11-20", 600, 660),
    ],
  });

  expect(heading()).toBe("9 – 15 November");
  await waitFor(() =>
    expect(rowsIn("Friday 13 November")).toEqual([
      "Networks09:00–10:30",
      "Dentist10:00–10:45Clinic",
    ]),
  );
  expect(rowsIn("Monday 9 November")).toEqual(["Monday class09:00–10:00"]);
  expect(rowsIn("Saturday 14 November")).toEqual([]);
});

test("whole-day events, exams and due tasks sit above the hours", async () => {
  await openCalendar({
    events: [eventNamed("Trip", "2026-11-13")],
    exams: [examNamed("Algorithms", "2026-11-13", { time: "14:00" })],
    tasks: [
      taskNamed("Essay", { dueDate: "2026-11-13" }),
      taskNamed("Handed in", { dueDate: "2026-11-13", status: "done" }),
    ],
  });

  await waitFor(() =>
    expect(rowsIn("All day, Friday 13 November")).toEqual([
      "Trip",
      "Exam: Algorithms, 14:00",
      "Due: Essay",
    ]),
  );
});

test("an event is added from the button, on today", async () => {
  await openCalendar();

  fireEvent.click(screen.getByRole("button", { name: "Add event" }));
  expect((inDialog().getByLabelText("Date") as HTMLInputElement).value).toBe(
    "2026-11-13",
  );
  fill("Title", "Study session");
  fill("Starts", "15:00");
  fill("Ends", "16:30");
  fireEvent.click(inDialog().getByRole("button", { name: "Add event" }));

  await waitFor(() =>
    expect(rowsIn("Friday 13 November")).toEqual(["Study session15:00–16:30"]),
  );
});

test("clicking an hour starts an event at that day and time", async () => {
  await openCalendar();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Add an event on Wednesday 11 November at 14:00",
    }),
  );

  const dialog = inDialog();
  expect((dialog.getByLabelText("Date") as HTMLInputElement).value).toBe(
    "2026-11-11",
  );
  expect((dialog.getByLabelText("Starts") as HTMLInputElement).value).toBe(
    "14:00",
  );
  expect((dialog.getByLabelText("Ends") as HTMLInputElement).value).toBe(
    "15:00",
  );
});

test("an event without a title, or ending before it starts, is refused with the reason", async () => {
  await openCalendar();
  fireEvent.click(screen.getByRole("button", { name: "Add event" }));

  fireEvent.click(inDialog().getByRole("button", { name: "Add event" }));
  expect(inDialog().getByRole("alert").textContent).toBe(
    "Give the event a title.",
  );

  fill("Title", "Run");
  fill("Starts", "10:00");
  fill("Ends", "09:00");
  fireEvent.click(inDialog().getByRole("button", { name: "Add event" }));
  expect(inDialog().getByRole("alert").textContent).toBe(
    "The end must be after the start.",
  );
});

test("a failed save keeps the dialog open and says so", async () => {
  await openCalendar({ failing: ["saveEvent"] });
  fireEvent.click(screen.getByRole("button", { name: "Add event" }));
  fill("Title", "Run");

  fireEvent.click(inDialog().getByRole("button", { name: "Add event" }));

  expect((await inDialog().findByRole("alert")).textContent).toBe(
    "Could not add the event.",
  );
});

test("an event can be changed to take the whole day", async () => {
  await openCalendar({
    events: [eventNamed("Dentist", "2026-11-13", 600, 645)],
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "Dentist, 10:00 to 10:45" }),
  );

  fireEvent.click(inDialog().getByLabelText("All day"));
  expect(inDialog().queryByLabelText("Starts")).toBeNull();
  fireEvent.click(inDialog().getByRole("button", { name: "Save" }));

  await waitFor(() =>
    expect(rowsIn("All day, Friday 13 November")).toEqual(["Dentist"]),
  );
  expect(rowsIn("Friday 13 November")).toEqual([]);
});

test("an event can be deleted", async () => {
  await openCalendar({
    events: [eventNamed("Dentist", "2026-11-13", 600, 645)],
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "Dentist, 10:00 to 10:45" }),
  );

  fireEvent.click(inDialog().getByRole("button", { name: "Delete event" }));

  await waitFor(() => expect(rowsIn("Friday 13 November")).toEqual([]));
});

test("steps through weeks and comes back to today", async () => {
  await openCalendar({
    events: [eventNamed("Next week", "2026-11-20", 600, 660)],
  });

  fireEvent.click(screen.getByRole("button", { name: "Next week" }));
  expect(heading()).toBe("16 – 22 November");
  await waitFor(() =>
    expect(rowsIn("Friday 20 November")).toEqual(["Next week10:00–11:00"]),
  );

  fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
  fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
  expect(heading()).toBe("2 – 8 November");

  fireEvent.click(screen.getByRole("button", { name: "Today" }));
  expect(heading()).toBe("9 – 15 November");
});

test("a day in the week opens as its own view, and steps day by day", async () => {
  await openCalendar({
    timetables: [semester],
    entries: [entry("Monday class", 1, 540, 600)],
  });

  fireEvent.click(
    await screen.findByRole("button", { name: "Open Monday 9 November" }),
  );

  expect(heading()).toBe("Monday 9 November");
  expect(rowsIn("Monday 9 November")).toEqual(["Monday class09:00–10:00"]);
  expect(
    screen.queryByRole("list", { name: "Tuesday 10 November" }),
  ).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Next day" }));
  expect(heading()).toBe("Tuesday 10 November");
});

test("the month shows what is particular to each date, not the weekly timetable", async () => {
  await openCalendar({
    timetables: [semester],
    entries: [entry("Networks", 5, 540, 630)],
    events: [
      eventNamed("Dentist", "2026-11-13", 600, 645),
      eventNamed("Trip", "2026-11-13"),
      eventNamed("Cinema", "2026-11-13", 1200, 1320),
    ],
    exams: [examNamed("Algorithms", "2026-11-13")],
  });

  fireEvent.click(screen.getByRole("radio", { name: "Month" }));

  expect(heading()).toBe("November 2026");
  await waitFor(() =>
    expect(rowsIn("Friday 13 November")).toEqual([
      "Trip",
      "Exam: Algorithms",
      "2 more",
    ]),
  );
  expect(screen.queryByText("Networks")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(heading()).toBe("December 2026");
});

test("a date in the month opens that day", async () => {
  await openCalendar();
  fireEvent.click(screen.getByRole("radio", { name: "Month" }));

  fireEvent.click(
    screen.getByRole("button", { name: "Open Tuesday 24 November" }),
  );

  expect(heading()).toBe("Tuesday 24 November");
});

test("the chosen view is remembered", async () => {
  localStorage.setItem("atlas.schedule-view", "month");

  await openCalendar();

  expect(heading()).toBe("November 2026");
});

test("the timetable is one switch away inside Schedule", async () => {
  await openCalendar();

  fireEvent.click(screen.getByRole("radio", { name: "Timetable" }));

  expect(
    await screen.findByRole("heading", { name: "No timetable yet" }),
  ).toBeDefined();
});

test("Home lists the next events and leads to the schedule", async () => {
  renderApp(
    createFakeData({
      events: [
        eventNamed("Later", "2026-11-20", 600, 660),
        eventNamed("Dentist", "2026-11-13", 900, 945),
        eventNamed("Gone", "2026-11-12", 600, 660),
      ],
    }),
  );

  await waitFor(() =>
    expect(rowsIn("Upcoming events")).toEqual([
      "DentistToday at 15:00",
      "LaterFri 20 Nov at 10:00",
    ]),
  );
});
