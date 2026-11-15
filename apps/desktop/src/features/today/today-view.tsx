import {
  type AssistantEngine,
  type AtlasData,
  DISPLAY_LOCALE,
  dayProgress,
  daySpan,
  describeCountdown,
  describeMinutes,
  describeNextUp,
  EMPTY_TASK_DRAFT,
  formatLocalDate,
  greeting,
  minutesOfDay,
  minutesToTime,
  projectProgress,
  splitExams,
  TASK_TITLE_MAX_LENGTH,
  type Task,
  tasksDueSoon,
  todaysEntries,
  toLocalDate,
  useAllTimetableEntries,
  useCreateDocument,
  useCreateTask,
  useDocuments,
  useExams,
  useProjects,
  useTasks,
  useTimetables,
  useUpdateTask,
  validateTask,
  weekOverview,
} from "@atlas/core";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssistantPanel } from "@/features/assistant/assistant-panel";
import { AtlasSphere } from "@/features/assistant/atlas-sphere";
import { TaskRow } from "@/features/tasks/task-row";
import { ENTRY_COLORS } from "@/features/timetable/entry-colors";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { DayLine } from "./day-line";
import { DayRing } from "./day-ring";
import { WeekStrip } from "./week-strip";

const weekdayFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  weekday: "long",
});
const dateFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: "numeric",
  month: "long",
});

interface TodayViewProps {
  data: AtlasData;
  /** What answers in the assistant, once there is one. */
  assistant?: AssistantEngine;
  workspaceId: string;
  /** Jumps to the page where the full list lives. */
  onOpen: (page: "tasks" | "schedule" | "documents") => void;
  onOpenDocument: (documentId: string) => void;
  /** Jumps to the exams area of Tasks & Exams. */
  onOpenExams: () => void;
}

/** Home: what is happening today and this week, with the assistant's sphere. */
export function TodayView({
  data,
  assistant,
  workspaceId,
  onOpen,
  onOpenDocument,
  onOpenExams,
}: TodayViewProps) {
  const now = useNow(5_000);
  const today = toLocalDate(now);
  const timetables = useTimetables(data, workspaceId);
  const allEntries = useAllTimetableEntries(data, timetables.data ?? []);
  const tasks = useTasks(data, workspaceId);
  const documents = useDocuments(data, workspaceId);
  const update = useUpdateTask(data, workspaceId);
  const projects = useProjects(data, workspaceId);
  const exams = useExams(data, workspaceId);
  const createTask = useCreateTask(data, workspaceId);
  const createDocument = useCreateDocument(data, workspaceId);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  // What quick capture last did or refused, said back to the user.
  const [captured, setCaptured] = useState<string>();
  const [captureError, setCaptureError] = useState<string>();

  const entries = todaysEntries(timetables.data ?? [], allEntries.entries, now);
  const span = daySpan(entries);
  const progress = dayProgress(entries, now);
  const soon = tasksDueSoon(tasks.data ?? [], today);
  const week = weekOverview(
    timetables.data ?? [],
    allEntries.entries,
    tasks.data ?? [],
    now,
  );
  const nothingDue =
    soon.overdue.length + soon.today.length + soon.thisWeek.length === 0;
  const hasNoTimetable = timetables.isSuccess && timetables.data.length === 0;
  const severalTimetables = (timetables.data?.length ?? 0) > 1;
  const nextExams = splitExams(exams.data ?? [], today).upcoming.slice(0, 3);
  const recentDocuments = documents.data?.slice(0, 4) ?? [];
  const activeProjects = projectProgress(
    projects.data ?? [],
    tasks.data ?? [],
  ).slice(0, 4);
  const error =
    timetables.error ??
    allEntries.error ??
    tasks.error ??
    documents.error ??
    projects.error ??
    exams.error ??
    update.error ??
    createTask.error ??
    createDocument.error;

  function handleCapture(event: FormEvent) {
    event.preventDefault();
    const result = validateTask({ ...EMPTY_TASK_DRAFT, title: newTitle });
    setCaptured(undefined);
    if (!result.ok) {
      setCaptureError(result.message);
      return;
    }
    setCaptureError(undefined);
    createTask.mutate(
      { id: crypto.randomUUID(), ...result.value },
      {
        onSuccess: (created) => {
          setNewTitle("");
          setCaptured(`Added “${created.title}” to your tasks.`);
        },
      },
    );
  }

  function row(task: Task, overdue = false) {
    return (
      <TaskRow
        key={task.id}
        task={task}
        today={today}
        overdue={overdue}
        onToggle={() =>
          update.mutate({
            id: task.id,
            status: task.status === "done" ? "todo" : "done",
          })
        }
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-12 pt-14 pb-16">
      <header className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{greeting(now)}</p>
          <h1 className="mt-1.5 font-heading text-[2.75rem] leading-[1.05] tracking-tight">
            {weekdayFormat.format(now)},{" "}
            <span className="text-muted-foreground">
              {dateFormat.format(now)}
            </span>
          </h1>
          <p className="mt-3 text-2xl font-light tracking-tight text-muted-foreground tabular-nums">
            <span className="sr-only">The time is </span>
            {minutesToTime(minutesOfDay(now))}
          </p>
        </div>
        <button
          type="button"
          aria-label="Open the ATLAS assistant"
          aria-haspopup="dialog"
          onClick={() => setAssistantOpen(true)}
          className="mt-1 mr-3 shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-8 focus-visible:ring-offset-background"
        >
          <AtlasSphere size={96} />
        </button>
      </header>
      <AssistantPanel
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        engine={assistant}
      />

      <section aria-label="Quick capture" className="mt-10">
        <div className="flex flex-wrap gap-2">
          <form
            onSubmit={handleCapture}
            noValidate
            className="flex min-w-64 flex-1 gap-2"
          >
            <Input
              aria-label="New task"
              value={newTitle}
              maxLength={TASK_TITLE_MAX_LENGTH}
              placeholder="Add a task"
              onChange={(event) => setNewTitle(event.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={createTask.isPending}
            >
              Add task
            </Button>
          </form>
          <Button
            variant="outline"
            disabled={createDocument.isPending}
            onClick={() =>
              createDocument.mutate(crypto.randomUUID(), {
                onSuccess: (created) => onOpenDocument(created.id),
              })
            }
          >
            New document
          </Button>
        </div>
        {captureError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {captureError}
          </p>
        ) : (
          <p
            role="status"
            className="mt-2 min-h-5 text-sm text-muted-foreground"
          >
            {captured}
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error.message}
        </p>
      )}

      <div className="mt-8 grid gap-x-14 gap-y-12 lg:grid-cols-12">
        <div className="grid content-start gap-12 lg:col-span-7">
          <Block
            title="On today"
            action={
              !hasNoTimetable && (
                <BlockLink onClick={() => onOpen("schedule")}>
                  Open schedule
                </BlockLink>
              )
            }
          >
            {hasNoTimetable ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  You have no timetable yet.
                </p>
                <Button variant="outline" onClick={() => onOpen("schedule")}>
                  Set up a timetable
                </Button>
              </div>
            ) : (
              <p className="text-base">{describeNextUp(entries, now)}</p>
            )}

            {span && (
              <div className="mt-5">
                <DayLine
                  entries={entries}
                  startHour={span.startHour}
                  endHour={span.endHour}
                  now={now}
                />
              </div>
            )}

            {entries.length > 0 && (
              <ul
                aria-label="Today's timetable"
                className="mt-4 divide-y divide-border"
              >
                {entries.map(({ entry, timetableName, status }) => (
                  <li
                    key={entry.id}
                    className={cn(
                      "flex items-baseline gap-4 py-2.5 text-sm",
                      status === "past" && "text-muted-foreground",
                    )}
                  >
                    <span className="w-24 shrink-0 tabular-nums">
                      {minutesToTime(entry.startMinute)}–
                      {minutesToTime(entry.endMinute)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {entry.title}
                    </span>
                    {status === "now" && (
                      <span className="flex shrink-0 items-center gap-1.5 font-medium">
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-signal"
                        />
                        Now
                      </span>
                    )}
                    <span className="shrink-0 text-muted-foreground">
                      {[entry.location, severalTimetables && timetableName]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block
            title="Due soon"
            action={
              <BlockLink onClick={() => onOpen("tasks")}>
                {tasks.data?.length ? "All tasks" : "Add a task"}
              </BlockLink>
            }
          >
            {tasks.isSuccess && nothingDue ? (
              <p className="text-sm text-muted-foreground">
                Nothing is due in the next week.
              </p>
            ) : (
              <ul
                aria-label="Due soon"
                className="-mt-2 divide-y divide-border"
              >
                {soon.overdue.map((task) => row(task, true))}
                {soon.today.map((task) => row(task))}
                {soon.thisWeek.map((task) => row(task))}
              </ul>
            )}
          </Block>
        </div>

        <div className="grid content-start gap-12 lg:col-span-5">
          <Block title="At a glance">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
              <DayRing
                fraction={progress.fraction}
                hasEntries={entries.length > 0}
              />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4">
                <Figure
                  label="On today"
                  value={entries.length}
                  note={
                    progress.totalMinutes > 0
                      ? describeMinutes(progress.totalMinutes)
                      : undefined
                  }
                />
                <Figure
                  label="Overdue"
                  value={soon.overdue.length}
                  alarming={soon.overdue.length > 0}
                />
                <Figure label="Due today" value={soon.today.length} />
                <Figure label="Due this week" value={soon.thisWeek.length} />
              </dl>
            </div>
          </Block>

          <Block
            title="Exams"
            action={<BlockLink onClick={onOpenExams}>All exams</BlockLink>}
          >
            {exams.isSuccess && nextExams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exams coming up.
              </p>
            ) : (
              <ul aria-label="Upcoming exams" className="grid gap-2.5">
                {nextExams.map((exam) => (
                  <li
                    key={exam.id}
                    className="flex items-baseline gap-3 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {exam.subject}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {formatLocalDate(exam.date, today)}
                    </span>
                    <span className="w-20 shrink-0 text-right tabular-nums">
                      {describeCountdown(exam.date, today)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="This week">
            <WeekStrip days={week} />
          </Block>

          <Block
            title="Projects"
            action={
              <BlockLink onClick={() => onOpen("tasks")}>Open tasks</BlockLink>
            }
          >
            {projects.isSuccess && activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <ul aria-label="Projects" className="grid gap-3.5">
                {activeProjects.map(({ project, done, total }) => (
                  <li key={project.id} className="text-sm">
                    <div className="flex items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          ENTRY_COLORS[project.color].swatch,
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {project.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {total === 0 ? "No tasks" : `${done} of ${total} done`}
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/8"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-atlas motion-reduce:transition-none"
                        style={{
                          width: `${total === 0 ? 0 : (done / total) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block
            title="Documents"
            action={
              <BlockLink onClick={() => onOpen("documents")}>
                All documents
              </BlockLink>
            }
          >
            {documents.isSuccess && recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents yet.</p>
            ) : (
              <ul aria-label="Recent documents" className="-mx-2 -mt-1.5 grid">
                {recentDocuments.map((document) => (
                  <li key={document.id}>
                    <button
                      type="button"
                      onClick={() => onOpenDocument(document.id)}
                      className={cn(
                        "w-full truncate rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-foreground/6 focus-visible:ring-3 focus-visible:ring-ring/50",
                        !document.title && "text-muted-foreground",
                      )}
                    >
                      {document.title || "Untitled"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      </div>
    </section>
  );
}

/**
 * One part of the overview. Parts are set apart by a heading on a hairline
 * and by space, not by boxes.
 */
function Block({
  title,
  action,
  children,
}: {
  title: string;
  /** A quiet link to the page with the full picture. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex min-h-7 items-center justify-between gap-4 border-b border-border pb-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function BlockLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="link"
      size="sm"
      className="h-auto px-0 font-normal"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Figure({
  label,
  value,
  note,
  alarming,
}: {
  label: string;
  value: number;
  note?: string;
  alarming?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-2xl font-light tabular-nums",
          alarming && "text-destructive",
        )}
      >
        {value}
        {note && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {note}
          </span>
        )}
      </dd>
    </div>
  );
}
