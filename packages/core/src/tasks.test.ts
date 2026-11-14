import { describe, expect, test } from "vitest";
import {
  EMPTY_TASK_DRAFT,
  groupTasks,
  subtasksOf,
  type Task,
  tasksDueSoon,
  validateProject,
  validateTask,
} from "./tasks";

let created = 0;
function task(title: string, extra: Partial<Task> = {}): Task {
  created += 1;
  return {
    ...EMPTY_TASK_DRAFT,
    id: title,
    title,
    status: "todo",
    completedAt: null,
    createdAt: `2026-11-01T00:00:${String(created).padStart(2, "0")}.000Z`,
    ...extra,
  };
}

const titles = (tasks: Task[]) => tasks.map((item) => item.title);
const today = "2026-11-13";

describe("groupTasks", () => {
  test("splits open tasks into overdue, today, upcoming and no date", () => {
    const groups = groupTasks(
      [
        task("Next week", { dueDate: "2026-11-20" }),
        task("Yesterday", { dueDate: "2026-11-12" }),
        task("Due today", { dueDate: "2026-11-13" }),
        task("Someday"),
      ],
      today,
    );

    expect(titles(groups.overdue)).toEqual(["Yesterday"]);
    expect(titles(groups.today)).toEqual(["Due today"]);
    expect(titles(groups.upcoming)).toEqual(["Next week"]);
    expect(titles(groups.noDate)).toEqual(["Someday"]);
    expect(groups.done).toEqual([]);
  });

  test("keeps a task in today all day, even after its time has passed", () => {
    const groups = groupTasks(
      [task("Morning", { dueDate: today, dueTime: "00:01" })],
      today,
    );

    expect(titles(groups.today)).toEqual(["Morning"]);
  });

  test("orders by date, then time, then priority", () => {
    const groups = groupTasks(
      [
        task("Later date", { dueDate: "2026-11-22" }),
        task("All day, low", { dueDate: "2026-11-20", priority: "low" }),
        task("All day, high", { dueDate: "2026-11-20", priority: "high" }),
        task("Afternoon", { dueDate: "2026-11-20", dueTime: "15:00" }),
        task("Morning", { dueDate: "2026-11-20", dueTime: "09:00" }),
      ],
      today,
    );

    expect(titles(groups.upcoming)).toEqual([
      "Morning",
      "Afternoon",
      "All day, high",
      "All day, low",
      "Later date",
    ]);
  });

  test("orders tasks without a date by priority, then oldest first", () => {
    const groups = groupTasks(
      [
        task("Older, none"),
        task("Newer, none"),
        task("Medium", { priority: "medium" }),
        task("High", { priority: "high" }),
      ],
      today,
    );

    expect(titles(groups.noDate)).toEqual([
      "High",
      "Medium",
      "Older, none",
      "Newer, none",
    ]);
  });

  test("puts finished tasks in done, most recently finished first", () => {
    const groups = groupTasks(
      [
        task("Finished Monday", {
          status: "done",
          completedAt: "2026-11-09T10:00:00.000Z",
          dueDate: "2026-11-01",
        }),
        task("Finished Tuesday", {
          status: "done",
          completedAt: "2026-11-10T10:00:00.000Z",
        }),
      ],
      today,
    );

    expect(titles(groups.done)).toEqual([
      "Finished Tuesday",
      "Finished Monday",
    ]);
    expect(groups.overdue).toEqual([]);
  });

  test("counts a task in progress as open", () => {
    const groups = groupTasks([task("Started", { status: "doing" })], today);

    expect(titles(groups.noDate)).toEqual(["Started"]);
  });

  test("leaves subtasks out: they stay with their parent", () => {
    const groups = groupTasks(
      [task("Essay"), task("Outline", { parentId: "Essay" })],
      today,
    );

    expect(titles(groups.noDate)).toEqual(["Essay"]);
  });
});

describe("subtasksOf", () => {
  test("returns only that task's subtasks, oldest first", () => {
    const tasks = [
      task("Essay"),
      task("Outline", { parentId: "Essay" }),
      task("Other parent's", { parentId: "Report" }),
      task("Draft", { parentId: "Essay" }),
    ];

    expect(titles(subtasksOf(tasks, "Essay"))).toEqual(["Outline", "Draft"]);
  });
});

describe("tasksDueSoon", () => {
  test("keeps overdue, today and the coming week, and drops the rest", () => {
    const soon = tasksDueSoon(
      [
        task("Late", { dueDate: "2026-11-10" }),
        task("Today", { dueDate: "2026-11-13" }),
        task("In a week", { dueDate: "2026-11-20" }),
        task("In eight days", { dueDate: "2026-11-21" }),
        task("No date"),
        task("Done already", { dueDate: "2026-11-13", status: "done" }),
      ],
      today,
    );

    expect(titles(soon.overdue)).toEqual(["Late"]);
    expect(titles(soon.today)).toEqual(["Today"]);
    expect(titles(soon.thisWeek)).toEqual(["In a week"]);
  });
});

describe("validateTask", () => {
  test("accepts a bare title, trimming it", () => {
    expect(validateTask({ ...EMPTY_TASK_DRAFT, title: "  Essay " })).toEqual({
      ok: true,
      value: { ...EMPTY_TASK_DRAFT, title: "Essay" },
    });
  });

  test.each([
    [{ title: "  " }, "Give the task a title."],
    [{ title: "x".repeat(201) }, "Keep the title under 200 characters."],
    [{ title: "Essay", dueDate: "2026-02-30" }, "Pick a valid date."],
    [
      { title: "Essay", dueDate: "2026-12-01", dueTime: "25:00" },
      "Enter the time as hours and minutes.",
    ],
    [
      { title: "Essay", dueTime: "09:00" },
      "Pick a date before setting a time.",
    ],
  ])("explains what is wrong with %j", (change, message) => {
    expect(validateTask({ ...EMPTY_TASK_DRAFT, ...change })).toEqual({
      ok: false,
      message,
    });
  });
});

describe("validateProject", () => {
  test("trims the name", () => {
    expect(validateProject({ name: " History ", color: "amber" })).toEqual({
      ok: true,
      value: { name: "History", color: "amber" },
    });
  });

  test("needs a name", () => {
    expect(validateProject({ name: "", color: "blue" })).toEqual({
      ok: false,
      message: "Give the project a name.",
    });
  });
});
