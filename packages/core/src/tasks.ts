import { z } from "zod";
import { addDays, type Validated } from "./dates";
import { TIMETABLE_COLORS, type TimetableColor } from "./timetables";

export const TASK_TITLE_MAX_LENGTH = 200;
export const TASK_NOTES_MAX_LENGTH = 5000;
export const PROJECT_NAME_MAX_LENGTH = 100;

/** Lowest to highest. */
export const TASK_PRIORITIES = ["none", "low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
};

/** Projects share the timetable's palette, so colours mean one thing. */
export const PROJECT_COLORS = TIMETABLE_COLORS;
export type ProjectColor = TimetableColor;

export interface Project {
  id: string;
  name: string;
  color: ProjectColor;
}

export interface ProjectDraft {
  name: string;
  color: ProjectColor;
}

/** What a person fills in for a task. */
export interface TaskDraft {
  title: string;
  notes: string;
  priority: TaskPriority;
  /** Calendar date, YYYY-MM-DD, with no time zone. Null means no due date. */
  dueDate: string | null;
  /** Clock time, HH:MM. Only allowed together with a date. */
  dueTime: string | null;
  projectId: string | null;
  /** Set on a subtask: the task it belongs to. Subtasks do not nest. */
  parentId: string | null;
}

export interface Task extends TaskDraft {
  id: string;
  status: TaskStatus;
  /** When it was marked done, as an ISO timestamp. */
  completedAt: string | null;
  createdAt: string;
}

export const EMPTY_TASK_DRAFT: TaskDraft = {
  title: "",
  notes: "",
  priority: "none",
  dueDate: null,
  dueTime: null,
  projectId: null,
  parentId: null,
};

const taskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give the task a title.")
      .max(
        TASK_TITLE_MAX_LENGTH,
        `Keep the title under ${TASK_TITLE_MAX_LENGTH} characters.`,
      ),
    notes: z
      .string()
      .max(
        TASK_NOTES_MAX_LENGTH,
        `Keep the notes under ${TASK_NOTES_MAX_LENGTH} characters.`,
      ),
    priority: z.enum(TASK_PRIORITIES),
    dueDate: z.iso.date("Pick a valid date.").nullable(),
    dueTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "Enter the time as hours and minutes.",
      )
      .nullable(),
    projectId: z.string().nullable(),
    parentId: z.string().nullable(),
  })
  .refine((task) => task.dueTime === null || task.dueDate !== null, {
    message: "Pick a date before setting a time.",
  });

const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the project a name.")
    .max(
      PROJECT_NAME_MAX_LENGTH,
      `Keep the name under ${PROJECT_NAME_MAX_LENGTH} characters.`,
    ),
  color: z.enum(PROJECT_COLORS),
});

export function validateTask(draft: TaskDraft): Validated<TaskDraft> {
  const parsed = taskSchema.safeParse(draft);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Check the task.",
      };
}

export function validateProject(draft: ProjectDraft): Validated<ProjectDraft> {
  const parsed = projectSchema.safeParse(draft);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Check the project.",
      };
}

const priorityRank = (task: Task) => TASK_PRIORITIES.indexOf(task.priority);

// Soonest first. On the same day, timed tasks come before all-day ones;
// after that the higher priority wins.
function byDueDate(a: Task, b: Task): number {
  return (
    (a.dueDate ?? "").localeCompare(b.dueDate ?? "") ||
    (a.dueTime ?? "24:00").localeCompare(b.dueTime ?? "24:00") ||
    priorityRank(b) - priorityRank(a) ||
    a.title.localeCompare(b.title)
  );
}

export interface TaskGroups {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  /** Open tasks with no due date, most important first. */
  noDate: Task[];
  /** Most recently finished first. */
  done: Task[];
}

/**
 * Sorts top-level tasks into the sections a list shows; subtasks stay with
 * their parent. A task counts as overdue from the day after its date,
 * whatever its time.
 */
export function groupTasks(tasks: Task[], today: string): TaskGroups {
  const topLevel = tasks.filter((task) => task.parentId === null);
  const open = topLevel.filter((task) => task.status !== "done");
  const dated = open.filter((task) => task.dueDate !== null);
  const due = (task: Task) => task.dueDate ?? "";

  return {
    overdue: dated.filter((task) => due(task) < today).sort(byDueDate),
    today: dated.filter((task) => due(task) === today).sort(byDueDate),
    upcoming: dated.filter((task) => due(task) > today).sort(byDueDate),
    noDate: open
      .filter((task) => task.dueDate === null)
      .sort(
        (a, b) =>
          priorityRank(b) - priorityRank(a) ||
          a.createdAt.localeCompare(b.createdAt),
      ),
    done: topLevel
      .filter((task) => task.status === "done")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
  };
}

/** A task's subtasks, oldest first. */
export function subtasksOf(tasks: Task[], parentId: string): Task[] {
  return tasks
    .filter((task) => task.parentId === parentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * The tasks worth showing on a day's overview: everything overdue or due
 * today, plus what is due within the coming week.
 */
export function tasksDueSoon(
  tasks: Task[],
  today: string,
): { overdue: Task[]; today: Task[]; thisWeek: Task[] } {
  const groups = groupTasks(tasks, today);
  const horizon = addDays(today, 7);
  return {
    overdue: groups.overdue,
    today: groups.today,
    thisWeek: groups.upcoming.filter((task) => (task.dueDate ?? "") <= horizon),
  };
}

export interface TasksData {
  listTasks(workspaceId: string): Promise<Task[]>;
  createTask(
    input: { id: string; workspaceId: string } & TaskDraft,
  ): Promise<Task>;
  /** Marking a task done records when; reopening it clears that. */
  updateTask(
    id: string,
    change: Partial<TaskDraft & { status: TaskStatus }>,
  ): Promise<Task>;
  /** Also deletes the task's subtasks. */
  deleteTask(id: string): Promise<void>;
  /** Oldest first. */
  listProjects(workspaceId: string): Promise<Project[]>;
  createProject(
    input: { id: string; workspaceId: string } & ProjectDraft,
  ): Promise<Project>;
  updateProject(id: string, draft: ProjectDraft): Promise<Project>;
  /** Its tasks are kept and simply lose their project. */
  deleteProject(id: string): Promise<void>;
}
