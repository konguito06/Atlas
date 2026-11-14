import type { Project, Task } from "@atlas/core";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createFakeData, renderApp, taskNamed } from "@/test/fakes";

// The screen sorts by "today", so pin it: Friday 13 November 2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 13, 12));
});
afterEach(() => {
  vi.useRealTimers();
});

const history: Project = { id: "history", name: "History", color: "amber" };

async function openTasks(
  seed: { tasks?: Task[]; projects?: Project[]; failing?: boolean } = {},
) {
  renderApp(
    createFakeData({
      tasks: seed.tasks,
      projects: seed.projects,
      failing: seed.failing ? ["saveTask"] : [],
    }),
  );
  fireEvent.click(await screen.findByRole("button", { name: /^Tasks/ }));
  await screen.findByRole("heading", { name: "Tasks" });
}

function rowsIn(group: string) {
  const list = screen.queryByRole("list", { name: group });
  return list
    ? within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    : [];
}

function addTask(title: string) {
  fireEvent.change(screen.getByLabelText("New task"), {
    target: { value: title },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add task" }));
}

function inDialog() {
  return within(screen.getByRole("dialog"));
}

function setField(label: string, value: string) {
  fireEvent.change(inDialog().getByLabelText(label), { target: { value } });
}

test("an empty list says how to start", async () => {
  await openTasks();

  expect(
    await screen.findByText("No tasks yet. Add the first one above."),
  ).toBeDefined();
});

test("sorts tasks into overdue, today, upcoming and no date", async () => {
  await openTasks({
    tasks: [
      taskNamed("Someday"),
      taskNamed("Lab report", { dueDate: "2026-11-14" }),
      taskNamed("Library book", { dueDate: "2026-11-12" }),
      taskNamed("Essay", { dueDate: "2026-11-13", dueTime: "23:59" }),
    ],
  });

  await waitFor(() =>
    expect(rowsIn("Overdue")).toEqual(["Library bookYesterday"]),
  );
  expect(rowsIn("Today")).toEqual(["EssayToday at 23:59"]);
  expect(rowsIn("Upcoming")).toEqual(["Lab reportTomorrow"]);
  expect(rowsIn("No date")).toEqual(["Someday"]);
});

test("a row shows status, subtask progress, priority and project", async () => {
  await openTasks({
    projects: [history],
    tasks: [
      taskNamed("Essay", {
        status: "doing",
        priority: "high",
        projectId: "history",
      }),
      taskNamed("Outline", { parentId: "Essay", status: "done" }),
      taskNamed("Draft", { parentId: "Essay" }),
    ],
  });

  await waitFor(() =>
    expect(rowsIn("No date")).toEqual(["EssayIn progress1/2HighHistory"]),
  );
});

test("typing a title adds a task with no date and clears the field", async () => {
  await openTasks();

  addTask("Buy notebook");

  await waitFor(() => expect(rowsIn("No date")).toEqual(["Buy notebook"]));
  expect((screen.getByLabelText("New task") as HTMLInputElement).value).toBe(
    "",
  );
});

test("a task without a title is refused with a reason", async () => {
  await openTasks();

  addTask("   ");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Give the task a title.",
  );
});

test("ticking a task moves it to done, where it can be reopened", async () => {
  await openTasks({ tasks: [taskNamed("Essay")] });

  fireEvent.click(await screen.findByLabelText("Mark Essay as done"));

  await waitFor(() => expect(rowsIn("No date")).toEqual([]));
  fireEvent.click(screen.getByRole("button", { name: "Show done (1)" }));
  expect(rowsIn("Done")).toEqual(["Essay"]);

  fireEvent.click(screen.getByLabelText("Mark Essay as not done"));
  await waitFor(() => expect(rowsIn("No date")).toEqual(["Essay"]));
});

test("a tick that cannot be saved says so and is undone", async () => {
  await openTasks({ tasks: [taskNamed("Essay")], failing: true });

  fireEvent.click(await screen.findByLabelText("Mark Essay as done"));

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Could not save the task.",
  );
  expect(rowsIn("No date")).toEqual(["Essay"]);
});

test("opening a task lets its date, priority, status and project be set", async () => {
  await openTasks({ tasks: [taskNamed("Essay")], projects: [history] });

  fireEvent.click(await screen.findByRole("button", { name: "Open Essay" }));
  setField("Title", "Essay draft");
  setField("Due date", "2026-11-13");
  setField("Time", "18:00");
  setField("Priority", "medium");
  setField("Status", "doing");
  setField("Project", "history");
  fireEvent.click(inDialog().getByRole("button", { name: "Save" }));

  await waitFor(() =>
    expect(rowsIn("Today")).toEqual([
      "Essay draftIn progressMediumHistoryToday at 18:00",
    ]),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("a time needs a date", async () => {
  await openTasks({ tasks: [taskNamed("Essay")] });

  fireEvent.click(await screen.findByRole("button", { name: "Open Essay" }));
  setField("Time", "18:00");
  fireEvent.click(inDialog().getByRole("button", { name: "Save" }));

  expect((await inDialog().findByRole("alert")).textContent).toBe(
    "Pick a date before setting a time.",
  );
});

test("subtasks can be added, ticked and removed inside a task", async () => {
  await openTasks({ tasks: [taskNamed("Essay")] });

  fireEvent.click(await screen.findByRole("button", { name: "Open Essay" }));
  setField("New subtask", "Outline");
  fireEvent.click(inDialog().getByRole("button", { name: "Add subtask" }));
  fireEvent.click(await inDialog().findByLabelText("Mark Outline as done"));
  setField("New subtask", "Draft");
  fireEvent.click(inDialog().getByRole("button", { name: "Add subtask" }));
  await inDialog().findByLabelText("Mark Draft as done");
  fireEvent.click(inDialog().getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(rowsIn("No date")).toEqual(["Essay1/2"]));

  fireEvent.click(screen.getByRole("button", { name: "Open Essay" }));
  fireEvent.click(inDialog().getByRole("button", { name: "Remove Draft" }));
  fireEvent.click(inDialog().getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(rowsIn("No date")).toEqual(["Essay1/1"]));
});

test("a task can be deleted from its dialog", async () => {
  await openTasks({ tasks: [taskNamed("Essay")] });

  fireEvent.click(await screen.findByRole("button", { name: "Open Essay" }));
  fireEvent.click(inDialog().getByRole("button", { name: "Delete task" }));

  expect(
    await screen.findByText("No tasks yet. Add the first one above."),
  ).toBeDefined();
});

test("a new project becomes the filter, and tasks added there belong to it", async () => {
  await openTasks({ tasks: [taskNamed("Unrelated")] });

  fireEvent.click(screen.getByRole("button", { name: "New project" }));
  setField("Name", "History");
  fireEvent.click(inDialog().getByLabelText("Amber"));
  fireEvent.click(inDialog().getByRole("button", { name: "Create project" }));

  expect(await screen.findByText("No tasks here yet.")).toBeDefined();
  addTask("Essay");
  await waitFor(() => expect(rowsIn("No date")).toEqual(["Essay"]));

  fireEvent.change(screen.getByLabelText("Project"), {
    target: { value: "all" },
  });
  expect(rowsIn("No date")).toEqual(["Unrelated", "EssayHistory"]);
});

test("the project filter narrows the list, including to tasks with no project", async () => {
  await openTasks({
    projects: [history],
    tasks: [taskNamed("Essay", { projectId: "history" }), taskNamed("Laundry")],
  });
  await waitFor(() => expect(rowsIn("No date")).toHaveLength(2));

  fireEvent.change(screen.getByLabelText("Project"), {
    target: { value: "history" },
  });
  expect(rowsIn("No date")).toEqual(["Essay"]);

  fireEvent.change(screen.getByLabelText("Project"), {
    target: { value: "none" },
  });
  expect(rowsIn("No date")).toEqual(["Laundry"]);
});

test("deleting a project asks first and keeps its tasks", async () => {
  await openTasks({
    projects: [history],
    tasks: [taskNamed("Essay", { projectId: "history" })],
  });
  await waitFor(() => expect(rowsIn("No date")).toHaveLength(1));

  fireEvent.change(screen.getByLabelText("Project"), {
    target: { value: "history" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Edit project" }));
  fireEvent.click(inDialog().getByRole("button", { name: "Delete" }));
  fireEvent.click(inDialog().getByRole("button", { name: "Delete project" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(rowsIn("No date")).toEqual(["Essay"]);
  expect((screen.getByLabelText("Project") as HTMLSelectElement).value).toBe(
    "all",
  );
});
