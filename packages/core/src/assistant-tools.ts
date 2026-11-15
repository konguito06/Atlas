import { z } from "zod";
import type { AtlasData } from "./data";
import {
  addDays,
  daysBetween,
  describeDueDate,
  formatLocalDate,
} from "./dates";
import { documentToPlainText, parseDocument } from "./document";
import { type CalendarEventDraft, validateEvent } from "./events";
import { validateExam } from "./exams";
import { scheduleDays } from "./schedule";
import { buildSearchEntries, searchEntries } from "./search";
import {
  EMPTY_TASK_DRAFT,
  PRIORITY_LABELS,
  TASK_PRIORITIES,
  type Task,
  validateTask,
} from "./tasks";
import { minutesToTime, timeToMinutes } from "./timetables";

// What the assistant can do in the workspace. It never touches the database:
// every tool goes through AtlasData, the same door the screens use, with its
// input checked first. Tools that change something say so in plain words
// (`summary`) and only run once the person has allowed exactly that.

/** How much of a document is handed to the model at once. */
const DOCUMENT_TEXT_LIMIT = 8000;

export interface ToolContext {
  data: AtlasData;
  workspaceId: string;
  /** Today's date where the person is, YYYY-MM-DD. */
  today: string;
}

export interface AssistantTool<Input = unknown> {
  name: string;
  /** Tells the model what the tool is for and when to use it. */
  description: string;
  input: z.ZodType<Input>;
  /** What the person is told while it runs: "Looking at your tasks". */
  doing: string;
  /**
   * Present on tools that change something: what the change is, in words
   * the person can judge. A tool with this never runs without approval.
   */
  summary?: (input: Input, context: ToolContext) => string | Promise<string>;
  /** Returns something that can be written as JSON. */
  run: (input: Input, context: ToolContext) => Promise<unknown>;
}

const date = z.iso.date().describe("A date as YYYY-MM-DD");
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .describe("A 24-hour time as HH:MM");

// Keeps a tool's input type attached to its functions.
function tool<Input>(definition: AssistantTool<Input>): AssistantTool {
  return definition as AssistantTool;
}

async function findTask(
  { data, workspaceId }: ToolContext,
  id: string,
): Promise<Task> {
  const task = (await data.listTasks(workspaceId)).find(
    (candidate) => candidate.id === id,
  );
  if (!task) throw new Error("There is no task with that id.");
  return task;
}

async function loadSchedule(
  { data, workspaceId, today }: ToolContext,
  dates: string[],
) {
  const timetables = await data.listTimetables(workspaceId);
  const [entries, events, exams, tasks] = await Promise.all([
    Promise.all(
      timetables.map((timetable) => data.listTimetableEntries(timetable.id)),
    ),
    data.listEvents(workspaceId),
    data.listExams(workspaceId),
    data.listTasks(workspaceId),
  ]);
  return scheduleDays(
    dates,
    { timetables, entries: entries.flat(), events, exams, tasks },
    today,
  );
}

export const ASSISTANT_TOOLS: AssistantTool[] = [
  tool({
    name: "get_schedule",
    doing: "Looking at your schedule",
    description:
      "What is on between two dates (at most 14 days): timetable classes, events, exams and tasks due, day by day. Use it for questions about a day or a week.",
    input: z.object({ from: date, to: date }),
    async run({ from, to }, context) {
      const length = Math.min(Math.max(daysBetween(from, to), 0), 13) + 1;
      const dates = Array.from({ length }, (_, index) => addDays(from, index));
      const days = await loadSchedule(context, dates);
      return days.map((day) => ({
        date: day.date,
        weekday: formatLocalDate(day.date, context.today).split(" ")[0],
        timed: day.timed.map((item) => ({
          kind: item.kind === "entry" ? "timetable" : "event",
          title: item.title,
          start: minutesToTime(item.startMinute),
          end: minutesToTime(item.endMinute),
          location: item.location || undefined,
        })),
        allDay: day.allDay.map((item) => ({
          kind: item.kind === "task" ? "task due" : item.kind,
          title: item.title,
          time: item.kind === "event" ? undefined : (item.time ?? undefined),
        })),
      }));
    },
  }),

  tool({
    name: "list_tasks",
    doing: "Looking at your tasks",
    description:
      "The person's tasks, with due dates, priority, project and linked exam. Open tasks by default.",
    input: z.object({
      show: z
        .enum(["open", "done", "all"])
        .default("open")
        .describe("Which tasks to list"),
    }),
    async run({ show }, { data, workspaceId, today }) {
      const [tasks, projects, exams] = await Promise.all([
        data.listTasks(workspaceId),
        data.listProjects(workspaceId),
        data.listExams(workspaceId),
      ]);
      return tasks
        .filter(
          (task) =>
            show === "all" || (task.status === "done") === (show === "done"),
        )
        .map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority === "none" ? undefined : task.priority,
          dueDate: task.dueDate ?? undefined,
          dueTime: task.dueTime ?? undefined,
          due: task.dueDate ? describeDueDate(task.dueDate, today) : undefined,
          overdue:
            task.status !== "done" && task.dueDate !== null
              ? task.dueDate < today
              : undefined,
          project: projects.find((project) => project.id === task.projectId)
            ?.name,
          exam: exams.find((exam) => exam.id === task.examId)?.subject,
          subtaskOf: tasks.find((parent) => parent.id === task.parentId)?.title,
          notes: task.notes || undefined,
        }));
    },
  }),

  tool({
    name: "list_exams",
    doing: "Checking your exams",
    description:
      "The person's exams with their dates and how many days away each is. Negative days are in the past.",
    input: z.object({}),
    async run(_input, { data, workspaceId, today }) {
      const [exams, tasks] = await Promise.all([
        data.listExams(workspaceId),
        data.listTasks(workspaceId),
      ]);
      return exams
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((exam) => {
          const linked = tasks.filter((task) => task.examId === exam.id);
          return {
            id: exam.id,
            subject: exam.subject,
            date: exam.date,
            time: exam.time ?? undefined,
            daysAway: daysBetween(today, exam.date),
            location: exam.location || undefined,
            notes: exam.notes || undefined,
            tasks: linked.map((task) => ({
              title: task.title,
              done: task.status === "done",
            })),
          };
        });
    },
  }),

  tool({
    name: "search_workspace",
    doing: "Searching your workspace",
    description:
      "Finds documents (by title and content), tasks, exams and events that contain the given words. Use a few key words, not a sentence.",
    input: z.object({ query: z.string().min(1).max(200) }),
    async run({ query }, { data, workspaceId, today }) {
      const [documents, texts, folders, tasks, projects, exams, events] =
        await Promise.all([
          data.listDocuments(workspaceId),
          data.listDocumentTexts(workspaceId),
          data.listFolders(workspaceId),
          data.listTasks(workspaceId),
          data.listProjects(workspaceId),
          data.listExams(workspaceId),
          data.listEvents(workspaceId),
        ]);
      const entries = buildSearchEntries(
        { documents, texts, folders, tasks, projects, exams, events },
        today,
      );
      return searchEntries(entries, query, 8).map((result) => ({
        kind: result.kind,
        id: result.id,
        title: result.title,
        detail: result.detail || undefined,
        excerpt: result.snippet,
      }));
    },
  }),

  tool({
    name: "read_document",
    doing: "Reading a document",
    description:
      "The text of one document, by the id that search_workspace returned. Long documents are cut short.",
    input: z.object({ id: z.string().min(1) }),
    async run({ id }, { data, workspaceId }) {
      const summary = (await data.listDocuments(workspaceId)).find(
        (document) => document.id === id,
      );
      if (!summary) throw new Error("There is no document with that id.");
      const parsed = parseDocument(await data.getDocumentContent(id));
      if (!parsed.ok) throw new Error("That document cannot be read.");
      const text = documentToPlainText(parsed.document);
      return {
        title: summary.title || "Untitled",
        text: text.slice(0, DOCUMENT_TEXT_LIMIT),
        cutShort: text.length > DOCUMENT_TEXT_LIMIT,
      };
    },
  }),

  tool({
    name: "create_task",
    doing: "Adding a task",
    description:
      "Adds a task. The person is asked to allow it first, so only call it when they asked for a task to be added.",
    input: z.object({
      title: z.string().min(1).max(200),
      dueDate: date.optional(),
      dueTime: time.optional(),
      priority: z.enum(TASK_PRIORITIES).optional(),
      notes: z.string().max(5000).optional(),
    }),
    summary: ({ title, dueDate, dueTime }, { today }) =>
      `Add the task “${title.trim()}”${
        dueDate
          ? `, due ${describeDueDate(dueDate, today)}${dueTime ? ` at ${dueTime}` : ""}`
          : ""
      }`,
    async run({ title, dueDate, dueTime, priority, notes }, context) {
      const draft = validateTask({
        ...EMPTY_TASK_DRAFT,
        title,
        dueDate: dueDate ?? null,
        dueTime: dueTime ?? null,
        priority: priority ?? "none",
        notes: notes ?? "",
      });
      if (!draft.ok) throw new Error(draft.message);
      const created = await context.data.createTask({
        id: crypto.randomUUID(),
        workspaceId: context.workspaceId,
        ...draft.value,
      });
      return { added: true, id: created.id, title: created.title };
    },
  }),

  tool({
    name: "create_event",
    doing: "Adding an event",
    description:
      "Adds an event to the calendar on one date, with a start and end time or for the whole day. The person is asked to allow it first, so only call it when they asked for something to be scheduled.",
    input: z.object({
      title: z.string().min(1).max(100),
      date,
      startTime: time.optional(),
      endTime: time.optional(),
      location: z.string().max(100).optional(),
    }),
    summary: ({ title, date: on, startTime, endTime }, { today }) =>
      `Add the event “${title.trim()}” on ${formatLocalDate(on, today)}${
        startTime && endTime ? `, ${startTime} to ${endTime}` : ", all day"
      }`,
    async run({ title, date: on, startTime, endTime, location }, context) {
      const draft: CalendarEventDraft = {
        title,
        date: on,
        startMinute: startTime ? timeToMinutes(startTime) : null,
        endMinute: endTime ? timeToMinutes(endTime) : null,
        location: location ?? "",
        notes: "",
        color: "blue",
      };
      const checked = validateEvent(draft);
      if (!checked.ok) throw new Error(checked.message);
      const created = await context.data.createEvent({
        id: crypto.randomUUID(),
        workspaceId: context.workspaceId,
        ...checked.value,
      });
      return { added: true, id: created.id, title: created.title };
    },
  }),

  tool({
    name: "complete_task",
    doing: "Updating a task",
    description:
      "Marks a task as done, or as not done again, by the id that list_tasks returned. The person is asked to allow it first.",
    input: z.object({
      id: z.string().min(1),
      done: z.boolean().default(true),
    }),
    summary: async ({ id, done }, context) =>
      `Mark “${(await findTask(context, id)).title}” as ${done ? "done" : "not done"}`,
    async run({ id, done }, context) {
      await findTask(context, id);
      const saved = await context.data.updateTask(id, {
        status: done ? "done" : "todo",
      });
      return { saved: true, title: saved.title, status: saved.status };
    },
  }),

  tool({
    name: "update_task",
    doing: "Updating a task",
    description:
      "Changes a task's title, due date, due time or priority, by the id that list_tasks returned. Pass only what changes; null clears a date or time. The person is asked to allow it first.",
    input: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        dueDate: date.nullable().optional(),
        dueTime: time.nullable().optional(),
        priority: z.enum(TASK_PRIORITIES).optional(),
      })
      .refine(
        ({ id: _id, ...change }) =>
          Object.values(change).some((value) => value !== undefined),
        { message: "Say what to change." },
      ),
    summary: async ({ id, title, dueDate, dueTime, priority }, context) => {
      const task = await findTask(context, id);
      const changes = [
        title !== undefined && `rename it to “${title.trim()}”`,
        dueDate !== undefined &&
          (dueDate === null
            ? "remove its due date"
            : `make it due ${describeDueDate(dueDate, context.today)}`),
        dueTime !== undefined &&
          (dueTime === null ? "remove its due time" : `at ${dueTime}`),
        priority !== undefined &&
          `set its priority to ${PRIORITY_LABELS[priority].toLowerCase()}`,
      ].filter(Boolean);
      return `Change “${task.title}”: ${changes.join(", ")}`;
    },
    async run({ id, ...change }, context) {
      const task = await findTask(context, id);
      // Checked as a whole, so a time is never left without a date.
      const draft = validateTask({
        title: change.title ?? task.title,
        notes: task.notes,
        priority: change.priority ?? task.priority,
        dueDate: change.dueDate === undefined ? task.dueDate : change.dueDate,
        dueTime:
          change.dueTime === undefined
            ? // Removing the date removes its time too.
              change.dueDate === null
              ? null
              : task.dueTime
            : change.dueTime,
        projectId: task.projectId,
        examId: task.examId,
        parentId: task.parentId,
      });
      if (!draft.ok) throw new Error(draft.message);
      const { title, priority, dueDate, dueTime } = draft.value;
      const saved = await context.data.updateTask(id, {
        title,
        priority,
        dueDate,
        dueTime,
      });
      return {
        saved: true,
        title: saved.title,
        dueDate: saved.dueDate ?? undefined,
        dueTime: saved.dueTime ?? undefined,
        priority: saved.priority,
      };
    },
  }),

  tool({
    name: "create_exam",
    doing: "Adding an exam",
    description:
      "Adds an exam with its subject and date. The person is asked to allow it first, so only call it when they asked for an exam to be added.",
    input: z.object({
      subject: z.string().min(1).max(100),
      date,
      time: time.optional(),
      location: z.string().max(100).optional(),
    }),
    summary: ({ subject, date: on, time: at }, { today }) =>
      `Add the exam “${subject.trim()}” on ${formatLocalDate(on, today)}${at ? ` at ${at}` : ""}`,
    async run({ subject, date: on, time: at, location }, context) {
      const draft = validateExam({
        subject,
        date: on,
        time: at ?? null,
        location: location ?? "",
        notes: "",
      });
      if (!draft.ok) throw new Error(draft.message);
      const created = await context.data.createExam({
        id: crypto.randomUUID(),
        workspaceId: context.workspaceId,
        ...draft.value,
      });
      return { added: true, id: created.id, subject: created.subject };
    },
  }),
];
