import type { Deadline } from "@atlas/core";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createFakeData, renderSignedIn } from "@/test/fakes";

// The screen sorts by "today", so pin it: Friday 13 November 2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 13, 12));
});
afterEach(() => {
  vi.useRealTimers();
});

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

async function openDeadlines(deadlines: Deadline[] = [], failing = false) {
  renderSignedIn(
    createFakeData({
      deadlines,
      failing: failing ? ["saveDeadline"] : [],
    }),
  );
  fireEvent.click(await screen.findByRole("button", { name: "Deadlines" }));
  await screen.findByRole("heading", { name: "Deadlines" });
}

function rowsIn(group: string) {
  const list = screen.queryByRole("list", { name: group });
  return list
    ? within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    : [];
}

function fillAddForm(title: string, date: string, time = "") {
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: date } });
  fireEvent.change(screen.getByLabelText("Time (optional)"), {
    target: { value: time },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add deadline" }));
}

test("an empty list says how to start", async () => {
  await openDeadlines();

  expect(
    await screen.findByText("No deadlines yet. Add the first one above."),
  ).toBeDefined();
});

test("sorts deadlines into overdue, today and upcoming", async () => {
  await openDeadlines([
    deadline("Lab report", "2026-11-14"),
    deadline("Library book", "2026-11-12"),
    deadline("Essay", "2026-11-13", { dueTime: "23:59" }),
  ]);

  await waitFor(() =>
    expect(rowsIn("Overdue")).toEqual(["Library bookYesterdayEdit"]),
  );
  expect(rowsIn("Today")).toEqual(["EssayToday at 23:59Edit"]);
  expect(rowsIn("Upcoming")).toEqual(["Lab reportTomorrowEdit"]);
});

test("adding a deadline lists it and clears the title for the next one", async () => {
  await openDeadlines();

  fillAddForm("Exam", "2026-11-14", "09:00");

  await waitFor(() =>
    expect(rowsIn("Upcoming")).toEqual(["ExamTomorrow at 09:00Edit"]),
  );
  expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("");
});

test("a deadline without a title is refused with a reason", async () => {
  await openDeadlines();

  fillAddForm("   ", "2026-11-14");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Give the deadline a title.",
  );
  expect(rowsIn("Upcoming")).toEqual([]);
});

test("ticking a deadline moves it to done, where it can be shown again", async () => {
  await openDeadlines([deadline("Essay", "2026-11-14")]);

  fireEvent.click(await screen.findByLabelText("Mark Essay as done"));

  await waitFor(() => expect(rowsIn("Upcoming")).toEqual([]));
  fireEvent.click(screen.getByRole("button", { name: "Show done (1)" }));
  expect(rowsIn("Done")).toEqual(["EssayTomorrowEdit"]);

  fireEvent.click(screen.getByLabelText("Mark Essay as not done"));
  await waitFor(() =>
    expect(rowsIn("Upcoming")).toEqual(["EssayTomorrowEdit"]),
  );
});

test("editing a deadline changes its title and date", async () => {
  await openDeadlines([deadline("Essay", "2026-11-14")]);

  fireEvent.click(await screen.findByRole("button", { name: "Edit Essay" }));
  const row = screen.getByRole("button", { name: "Save" }).closest("li");
  if (!row) throw new Error("expected the edit form inside a list item");
  fireEvent.change(within(row).getByLabelText("Title"), {
    target: { value: "Essay draft" },
  });
  fireEvent.change(within(row).getByLabelText("Date"), {
    target: { value: "2026-11-13" },
  });
  fireEvent.click(within(row).getByRole("button", { name: "Save" }));

  await waitFor(() =>
    expect(rowsIn("Today")).toEqual(["Essay draftTodayEdit"]),
  );
  expect(rowsIn("Upcoming")).toEqual([]);
});

test("a deadline can be deleted while editing it", async () => {
  await openDeadlines([deadline("Essay", "2026-11-14")]);

  fireEvent.click(await screen.findByRole("button", { name: "Edit Essay" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete deadline" }));

  expect(
    await screen.findByText("No deadlines yet. Add the first one above."),
  ).toBeDefined();
});

test("a tick that cannot be saved says so and is undone", async () => {
  await openDeadlines([deadline("Essay", "2026-11-14")], true);

  fireEvent.click(await screen.findByLabelText("Mark Essay as done"));

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Could not save the deadline.",
  );
  expect(rowsIn("Upcoming")).toEqual(["EssayTomorrowEdit"]);
});
