import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createFakeData, examNamed, renderApp, taskNamed } from "@/test/fakes";

// Pin the clock: Friday 13 November 2026, 11:30.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 13, 11, 30));
});
afterEach(() => {
  vi.useRealTimers();
});

async function openArea(area: "Tasks" | "Exams" | "Deadlines") {
  fireEvent.click(
    await screen.findByRole("button", { name: /^Tasks & Exams/ }),
  );
  fireEvent.click(await screen.findByRole("radio", { name: area }));
}

function rowsIn(name: string) {
  const list = screen.queryByRole("list", { name });
  return list
    ? within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    : [];
}

const field = (dialog: ReturnType<typeof within>, label: string) =>
  dialog.getByLabelText(label) as HTMLInputElement;

test("an exam needs only a subject and a date, and shows how long is left", async () => {
  renderApp(createFakeData());
  await openArea("Exams");
  expect(
    await screen.findByText(
      "No exams yet. Add one with its date to start the countdown.",
    ),
  ).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Add exam" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.change(field(dialog, "Subject"), {
    target: { value: "Algorithms" },
  });
  fireEvent.change(field(dialog, "Date"), { target: { value: "2026-12-10" } });
  fireEvent.click(dialog.getByRole("button", { name: "Add exam" }));

  await waitFor(() =>
    expect(rowsIn("Upcoming")).toEqual(["AlgorithmsThu 10 DecIn 27 days"]),
  );
});

test("an exam without a subject or a date is refused, with the reason", async () => {
  renderApp(createFakeData());
  await openArea("Exams");
  fireEvent.click(await screen.findByRole("button", { name: "Add exam" }));
  const dialog = within(await screen.findByRole("dialog"));

  fireEvent.click(dialog.getByRole("button", { name: "Add exam" }));
  expect(dialog.getByRole("alert").textContent).toBe(
    "Give the exam a subject.",
  );

  fireEvent.change(field(dialog, "Subject"), { target: { value: "Maths" } });
  fireEvent.click(dialog.getByRole("button", { name: "Add exam" }));
  expect(dialog.getByRole("alert").textContent).toBe(
    "Pick the date of the exam.",
  );
});

test("a failed save keeps the dialog open and says so", async () => {
  renderApp(createFakeData({ failing: ["saveExam"] }));
  await openArea("Exams");
  fireEvent.click(await screen.findByRole("button", { name: "Add exam" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.change(field(dialog, "Subject"), { target: { value: "Maths" } });
  fireEvent.change(field(dialog, "Date"), { target: { value: "2026-12-10" } });

  fireEvent.click(dialog.getByRole("button", { name: "Add exam" }));

  expect((await dialog.findByRole("alert")).textContent).toBe(
    "Could not add the exam.",
  );
});

test("lists exams soonest first, with time and place, and past ones apart", async () => {
  renderApp(
    createFakeData({
      exams: [
        examNamed("Statistics", "2026-12-12"),
        examNamed("Algorithms", "2026-11-17", {
          time: "09:00",
          location: "Hall A",
        }),
        examNamed("Logic", "2026-11-10"),
      ],
    }),
  );
  await openArea("Exams");

  await waitFor(() =>
    expect(rowsIn("Upcoming")).toEqual([
      "AlgorithmsTue 17 Nov at 09:00, Hall AIn 4 days",
      "StatisticsSat 12 DecIn 29 days",
    ]),
  );
  expect(rowsIn("Past")).toEqual(["LogicTue 10 Nov3 days ago"]);
});

test("an exam can be edited", async () => {
  renderApp(createFakeData({ exams: [examNamed("Algorithms", "2026-11-17")] }));
  await openArea("Exams");
  fireEvent.click(
    await screen.findByRole("button", { name: "Open Algorithms" }),
  );
  const dialog = within(await screen.findByRole("dialog"));

  fireEvent.change(field(dialog, "Date"), { target: { value: "2026-11-14" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  await waitFor(() =>
    expect(rowsIn("Upcoming")).toEqual(["AlgorithmsSat 14 NovTomorrow"]),
  );
});

test("tasks can be added to an exam and ticked off, and the exam shows the progress", async () => {
  renderApp(createFakeData({ exams: [examNamed("Algorithms", "2026-11-17")] }));
  await openArea("Exams");
  fireEvent.click(
    await screen.findByRole("button", { name: "Open Algorithms" }),
  );
  const dialog = within(await screen.findByRole("dialog"));

  fireEvent.change(dialog.getByLabelText("New task for this exam"), {
    target: { value: "Revise graphs" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Add" }));
  fireEvent.click(await dialog.findByLabelText("Mark Revise graphs as done"));
  await dialog.findByLabelText("Mark Revise graphs as not done");
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));

  await waitFor(() =>
    expect(rowsIn("Upcoming")).toEqual([
      "Algorithms1 of 1 tasks doneTue 17 NovIn 4 days",
    ]),
  );
});

test("deleting an exam keeps its tasks", async () => {
  renderApp(
    createFakeData({
      exams: [examNamed("Algorithms", "2026-11-17")],
      tasks: [taskNamed("Revise graphs", { examId: "Algorithms" })],
    }),
  );
  await openArea("Exams");
  fireEvent.click(
    await screen.findByRole("button", { name: "Open Algorithms" }),
  );
  fireEvent.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Delete exam",
    }),
  );

  await waitFor(() => expect(rowsIn("Upcoming")).toEqual([]));
  fireEvent.click(screen.getByRole("radio", { name: "Tasks" }));
  expect(await screen.findByText("Revise graphs")).toBeDefined();
});

test("a task offers no exam to link to when there are no exams", async () => {
  renderApp(createFakeData({ tasks: [taskNamed("Essay")] }));
  await openArea("Tasks");

  fireEvent.click(await screen.findByRole("button", { name: "Open Essay" }));

  const dialog = within(await screen.findByRole("dialog"));
  expect(dialog.queryByLabelText("For an exam (optional)")).toBeNull();
});

test("a task can be linked to an exam from the task itself", async () => {
  renderApp(
    createFakeData({
      exams: [examNamed("Algorithms", "2026-11-17")],
      tasks: [taskNamed("Past papers")],
    }),
  );
  await openArea("Tasks");
  fireEvent.click(
    await screen.findByRole("button", { name: "Open Past papers" }),
  );
  const dialog = within(await screen.findByRole("dialog"));

  fireEvent.change(await dialog.findByLabelText("For an exam (optional)"), {
    target: { value: "Algorithms" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  fireEvent.click(await screen.findByRole("radio", { name: "Exams" }));
  await waitFor(() =>
    expect(rowsIn("Upcoming")).toEqual([
      "Algorithms0 of 1 tasks doneTue 17 NovIn 4 days",
    ]),
  );
});

test("deadlines put dated tasks and exams in one line of time", async () => {
  renderApp(
    createFakeData({
      exams: [
        examNamed("Algorithms", "2026-11-17", { time: "09:00" }),
        examNamed("Statistics", "2026-12-12"),
      ],
      tasks: [
        taskNamed("Library book", { dueDate: "2026-11-12" }),
        taskNamed("Essay", { dueDate: "2026-11-13" }),
        taskNamed("Report", { dueDate: "2026-12-01" }),
        taskNamed("Someday"),
      ],
    }),
  );
  await openArea("Deadlines");

  await waitFor(() =>
    expect(rowsIn("Overdue")).toEqual(["Library bookYesterday"]),
  );
  expect(rowsIn("This week")).toEqual([
    "EssayToday",
    "AlgorithmsExamTue 17 Nov at 09:00",
  ]);
  expect(rowsIn("Later")).toEqual([
    "ReportTue 1 Dec",
    "StatisticsExamSat 12 Dec",
  ]);
});

test("with nothing dated, deadlines says what will appear there", async () => {
  renderApp(createFakeData({ tasks: [taskNamed("Someday")] }));
  await openArea("Deadlines");

  expect(
    await screen.findByText(/Nothing with a date is coming up\./),
  ).toBeDefined();
});

test("Home shows the next exams and leads to the exams area", async () => {
  renderApp(
    createFakeData({
      exams: [
        examNamed("Statistics", "2026-12-12"),
        examNamed("Algorithms", "2026-11-17"),
        examNamed("Logic", "2026-11-10"),
      ],
    }),
  );

  await waitFor(() =>
    expect(rowsIn("Upcoming exams")).toEqual([
      "AlgorithmsTue 17 NovIn 4 days",
      "StatisticsSat 12 DecIn 29 days",
    ]),
  );
  fireEvent.click(screen.getByRole("button", { name: "All exams" }));
  expect(await screen.findByRole("heading", { name: "Exams" })).toBeDefined();
});

test("Home says so when no exam is coming up", async () => {
  renderApp(createFakeData());

  expect(await screen.findByText("No exams coming up.")).toBeDefined();
});
