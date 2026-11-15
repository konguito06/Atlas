import { z } from "zod";
import { addDays, daysBetween, type Validated } from "./dates";
import type { Task } from "./tasks";

export const EXAM_SUBJECT_MAX_LENGTH = 100;
export const EXAM_LOCATION_MAX_LENGTH = 100;
export const EXAM_NOTES_MAX_LENGTH = 5000;

/**
 * What a person fills in for an exam. At heart an exam is a date; the rest
 * is optional. Tasks can point at an exam (Task.examId) when that is useful,
 * and never have to.
 */
export interface ExamDraft {
  subject: string;
  /** Calendar date, YYYY-MM-DD, with no time zone. */
  date: string;
  /** Clock time, HH:MM, when it is known. */
  time: string | null;
  location: string;
  notes: string;
}

export interface Exam extends ExamDraft {
  id: string;
  createdAt: string;
}

const examSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Give the exam a subject.")
    .max(
      EXAM_SUBJECT_MAX_LENGTH,
      `Keep the subject under ${EXAM_SUBJECT_MAX_LENGTH} characters.`,
    ),
  date: z.iso.date("Pick the date of the exam."),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter the time as hours and minutes.")
    .nullable(),
  location: z
    .string()
    .trim()
    .max(
      EXAM_LOCATION_MAX_LENGTH,
      `Keep the location under ${EXAM_LOCATION_MAX_LENGTH} characters.`,
    ),
  notes: z
    .string()
    .max(
      EXAM_NOTES_MAX_LENGTH,
      `Keep the notes under ${EXAM_NOTES_MAX_LENGTH} characters.`,
    ),
});

export function validateExam(draft: ExamDraft): Validated<ExamDraft> {
  const parsed = examSchema.safeParse(draft);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Check the exam.",
      };
}

function byDate(a: Exam, b: Exam): number {
  return (
    a.date.localeCompare(b.date) ||
    (a.time ?? "24:00").localeCompare(b.time ?? "24:00") ||
    a.subject.localeCompare(b.subject)
  );
}

/** Exams still to come (today included), soonest first, and those behind, latest first. */
export function splitExams(
  exams: Exam[],
  today: string,
): { upcoming: Exam[]; past: Exam[] } {
  return {
    upcoming: exams.filter((exam) => exam.date >= today).sort(byDate),
    past: exams
      .filter((exam) => exam.date < today)
      .sort((a, b) => byDate(b, a)),
  };
}

/** How far away a date is, in words: "Today", "In 12 days", "3 days ago". */
export function describeCountdown(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

/** The tasks linked to an exam, and how many are done. Subtasks do not count. */
export function examTasks(
  tasks: Task[],
  examId: string,
): { tasks: Task[]; done: number } {
  const linked = tasks.filter(
    (task) => task.examId === examId && task.parentId === null,
  );
  return {
    tasks: linked,
    done: linked.filter((task) => task.status === "done").length,
  };
}

/** One dated thing to be ready for: a task with a due date, or an exam. */
export type Deadline =
  | { kind: "task"; date: string; time: string | null; task: Task }
  | { kind: "exam"; date: string; time: string | null; exam: Exam };

export interface DeadlineGroups {
  /** Unfinished tasks whose date has passed. A past exam is simply over. */
  overdue: Deadline[];
  /** Today and the six days after. */
  thisWeek: Deadline[];
  later: Deadline[];
}

/**
 * Everything with a date, in one line of time: open tasks that have a due
 * date and exams still to come. Deadlines are a way of looking at tasks and
 * exams, not a third thing to keep.
 */
export function deadlines(
  tasks: Task[],
  exams: Exam[],
  today: string,
): DeadlineGroups {
  const all: Deadline[] = [
    ...tasks
      .filter(
        (task) =>
          task.parentId === null &&
          task.status !== "done" &&
          task.dueDate !== null,
      )
      .map(
        (task): Deadline => ({
          kind: "task",
          date: task.dueDate ?? "",
          time: task.dueTime,
          task,
        }),
      ),
    ...exams
      .filter((exam) => exam.date >= today)
      .map(
        (exam): Deadline => ({
          kind: "exam",
          date: exam.date,
          time: exam.time,
          exam,
        }),
      ),
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time ?? "24:00").localeCompare(b.time ?? "24:00"),
  );
  const horizon = addDays(today, 6);
  return {
    overdue: all.filter((item) => item.date < today),
    thisWeek: all.filter((item) => item.date >= today && item.date <= horizon),
    later: all.filter((item) => item.date > horizon),
  };
}

export interface ExamsData {
  listExams(workspaceId: string): Promise<Exam[]>;
  createExam(
    input: { id: string; workspaceId: string } & ExamDraft,
  ): Promise<Exam>;
  updateExam(id: string, draft: ExamDraft): Promise<Exam>;
  /** Tasks linked to it are kept and simply lose the link. */
  deleteExam(id: string): Promise<void>;
}
