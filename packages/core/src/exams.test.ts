import { describe, expect, test } from "vitest";
import {
  deadlines,
  describeCountdown,
  type Exam,
  examTasks,
  splitExams,
  validateExam,
} from "./exams";
import { EMPTY_TASK_DRAFT, type Task } from "./tasks";

const TODAY = "2026-11-13";

const exam = (subject: string, date: string, extra: Partial<Exam> = {}) =>
  ({
    id: subject,
    subject,
    date,
    time: null,
    location: "",
    notes: "",
    createdAt: "2026-11-01T00:00:00.000Z",
    ...extra,
  }) satisfies Exam;

const task = (title: string, extra: Partial<Task> = {}) =>
  ({
    ...EMPTY_TASK_DRAFT,
    id: title,
    title,
    status: "todo",
    completedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    ...extra,
  }) satisfies Task;

describe("validateExam", () => {
  const draft = {
    subject: " Algorithms ",
    date: "2026-12-10",
    time: null,
    location: "",
    notes: "",
  };

  test("accepts a subject and a date, and trims the subject", () => {
    expect(validateExam(draft)).toEqual({
      ok: true,
      value: { ...draft, subject: "Algorithms" },
    });
  });

  test.each([
    [{ subject: "  " }, "Give the exam a subject."],
    [{ date: "" }, "Pick the date of the exam."],
    [{ time: "25:00" }, "Enter the time as hours and minutes."],
  ])("refuses %o", (change, message) => {
    expect(validateExam({ ...draft, ...change })).toEqual({
      ok: false,
      message,
    });
  });
});

describe("splitExams", () => {
  const { upcoming, past } = splitExams(
    [
      exam("Later", "2026-12-20"),
      exam("Old", "2026-10-01"),
      exam("Today afternoon", TODAY, { time: "14:00" }),
      exam("Today morning", TODAY, { time: "09:00" }),
      exam("Recent", "2026-11-12"),
    ],
    TODAY,
  );

  test("upcoming includes today and runs soonest first", () => {
    expect(upcoming.map((item) => item.subject)).toEqual([
      "Today morning",
      "Today afternoon",
      "Later",
    ]);
  });

  test("past runs most recent first", () => {
    expect(past.map((item) => item.subject)).toEqual(["Recent", "Old"]);
  });
});

test.each([
  [TODAY, "Today"],
  ["2026-11-14", "Tomorrow"],
  ["2026-11-12", "Yesterday"],
  ["2026-11-25", "In 12 days"],
  ["2026-11-10", "3 days ago"],
  // Across the end of summer time, a day is still a day.
  ["2027-03-29", "In 136 days"],
])("describeCountdown(%s) is %s", (date, expected) => {
  expect(describeCountdown(date, TODAY)).toBe(expected);
});

test("examTasks finds the tasks linked to an exam and counts the done ones", () => {
  const result = examTasks(
    [
      task("Revise graphs", { examId: "algo", status: "done" }),
      task("Past papers", { examId: "algo" }),
      task("Paper 1", { examId: "algo", parentId: "Past papers" }),
      task("Other", { examId: "stats" }),
      task("Unlinked"),
    ],
    "algo",
  );

  expect(result.tasks.map((item) => item.title)).toEqual([
    "Revise graphs",
    "Past papers",
  ]);
  expect(result.done).toBe(1);
});

describe("deadlines", () => {
  const groups = deadlines(
    [
      task("Library book", { dueDate: "2026-11-12" }),
      task("Essay", { dueDate: TODAY, dueTime: "23:59" }),
      task("Handed in", { dueDate: TODAY, status: "done" }),
      task("No date"),
      task("Report", { dueDate: "2026-12-01" }),
      task("Step", { dueDate: TODAY, parentId: "Essay" }),
    ],
    [
      exam("Algorithms", "2026-11-19"),
      exam("Statistics", "2026-11-20"),
      exam("Sat last week", "2026-11-06"),
      exam("Quiz", TODAY, { time: "10:00" }),
    ],
    TODAY,
  );
  const names = (items: typeof groups.overdue) =>
    items.map((item) =>
      item.kind === "task" ? item.task.title : `Exam: ${item.exam.subject}`,
    );

  test("overdue holds unfinished tasks whose date has passed, never exams", () => {
    expect(names(groups.overdue)).toEqual(["Library book"]);
  });

  test("this week is today and the six days after, in order of time", () => {
    expect(names(groups.thisWeek)).toEqual([
      "Exam: Quiz",
      "Essay",
      "Exam: Algorithms",
    ]);
  });

  test("everything further off comes later", () => {
    expect(names(groups.later)).toEqual(["Exam: Statistics", "Report"]);
  });
});
