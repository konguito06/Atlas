import type { Timetable, TimetableEntry } from "@atlas/core";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { createFakeData, renderSignedIn } from "@/test/fakes";

const semester: Timetable = {
  id: "timetable-1",
  name: "Semester 1",
  days: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 18,
};

function entry(
  title: string,
  extra: Partial<TimetableEntry> = {},
): TimetableEntry {
  return {
    id: title,
    timetableId: semester.id,
    title,
    day: 1,
    startMinute: 540,
    endMinute: 630,
    location: "",
    color: "blue",
    ...extra,
  };
}

async function openTimetable(
  seed: { timetables?: Timetable[]; entries?: TimetableEntry[] } = {},
) {
  renderSignedIn(createFakeData(seed));
  fireEvent.click(await screen.findByRole("button", { name: "Timetable" }));
}

function type(label: string, value: string) {
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
}

function press(name: string) {
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name }));
}

test("with no timetable, creating one opens it with weekdays as columns", async () => {
  await openTimetable();

  fireEvent.click(
    await screen.findByRole("button", { name: "Create a timetable" }),
  );
  type("Name", "Semester 1");
  press("Create timetable");

  expect(
    await screen.findByRole("heading", { name: "Semester 1" }),
  ).toBeDefined();
  expect(screen.queryByRole("dialog")).toBeNull();
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
    expect(screen.getByText(day)).toBeDefined();
  }
  expect(screen.queryByText("Sat")).toBeNull();
});

test("a timetable needs a name", async () => {
  await openTimetable();

  fireEvent.click(
    await screen.findByRole("button", { name: "Create a timetable" }),
  );
  press("Create timetable");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Give the timetable a name.",
  );
});

test("shows each entry with its day, time and place", async () => {
  await openTimetable({
    timetables: [semester],
    entries: [entry("Algorithms", { location: "Room 2.1" })],
  });

  expect(
    await screen.findByRole("button", {
      name: "Algorithms, Monday 09:00 to 10:30, Room 2.1",
    }),
  ).toBeDefined();
});

test("clicking an empty slot starts an entry at that day and hour", async () => {
  await openTimetable({ timetables: [semester] });

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Add an entry on Wednesday at 10:00",
    }),
  );
  const dialog = screen.getByRole("dialog");
  expect(
    (within(dialog).getByLabelText("Day") as HTMLSelectElement).value,
  ).toBe("3");
  expect(
    (within(dialog).getByLabelText("Starts") as HTMLInputElement).value,
  ).toBe("10:00");
  expect(
    (within(dialog).getByLabelText("Ends") as HTMLInputElement).value,
  ).toBe("11:00");

  type("Title", "Seminar");
  fireEvent.click(within(dialog).getByLabelText("Green"));
  press("Add entry");

  expect(
    await screen.findByRole("button", {
      name: "Seminar, Wednesday 10:00 to 11:00",
    }),
  ).toBeDefined();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("an entry cannot end before it starts", async () => {
  await openTimetable({ timetables: [semester] });

  fireEvent.click(await screen.findByRole("button", { name: "Add entry" }));
  type("Title", "Backwards");
  type("Starts", "12:00");
  type("Ends", "11:00");
  press("Add entry");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "The end time must be after the start time.",
  );
});

test("editing an entry moves it to the new day and time", async () => {
  await openTimetable({
    timetables: [semester],
    entries: [entry("Algorithms")],
  });

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Algorithms, Monday 09:00 to 10:30",
    }),
  );
  type("Day", "2");
  type("Starts", "14:00");
  type("Ends", "15:00");
  press("Save");

  expect(
    await screen.findByRole("button", {
      name: "Algorithms, Tuesday 14:00 to 15:00",
    }),
  ).toBeDefined();
});

test("an entry can be deleted from its dialog", async () => {
  await openTimetable({
    timetables: [semester],
    entries: [entry("Algorithms")],
  });

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Algorithms, Monday 09:00 to 10:30",
    }),
  );
  press("Delete entry");

  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /^Algorithms/ })).toBeNull(),
  );
});

test("entries hidden by the chosen days are counted, and customising reveals them", async () => {
  await openTimetable({
    timetables: [semester],
    entries: [entry("Football", { day: 6 })],
  });

  expect(
    await screen.findByText(/1 entry is outside the days and hours shown\./),
  ).toBeDefined();
  expect(screen.queryByRole("button", { name: /^Football/ })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Customise" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByLabelText("Sat"));
  press("Save");

  expect(
    await screen.findByRole("button", {
      name: "Football, Saturday 09:00 to 10:30",
    }),
  ).toBeDefined();
  expect(screen.queryByText(/outside the days and hours shown/)).toBeNull();
});

test("customising changes the name and the hours shown", async () => {
  await openTimetable({ timetables: [semester] });
  await screen.findByRole("heading", { name: "Semester 1" });

  fireEvent.click(screen.getByRole("button", { name: "Customise" }));
  type("Name", "Spring");
  type("First hour", "10");
  press("Save");

  expect(await screen.findByRole("heading", { name: "Spring" })).toBeDefined();
  expect(
    screen.queryByRole("button", { name: "Add an entry on Monday at 09:00" }),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Add an entry on Monday at 10:00" }),
  ).toBeDefined();
});

test("deleting a timetable asks first", async () => {
  await openTimetable({ timetables: [semester] });
  await screen.findByRole("heading", { name: "Semester 1" });

  fireEvent.click(screen.getByRole("button", { name: "Customise" }));
  press("Delete");
  press("Keep it");
  // Back to the normal buttons: nothing was deleted.
  expect(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }),
  ).toBeDefined();

  press("Delete");
  press("Delete timetable");

  expect(
    await screen.findByRole("heading", { name: "No timetable yet" }),
  ).toBeDefined();
});

test("with several timetables, a picker switches between them", async () => {
  await openTimetable({
    timetables: [semester, { ...semester, id: "timetable-2", name: "Gym" }],
    entries: [entry("Algorithms")],
  });
  await screen.findByRole("heading", { name: "Semester 1" });

  fireEvent.change(screen.getByLabelText("Timetable"), {
    target: { value: "timetable-2" },
  });

  expect(await screen.findByRole("heading", { name: "Gym" })).toBeDefined();
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /^Algorithms/ })).toBeNull(),
  );
});
