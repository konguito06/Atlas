import {
  type AtlasData,
  type Deadline,
  deadlines,
  describeDueDate,
  toLocalDate,
  useExams,
  useTasks,
  useUpdateTask,
} from "@atlas/core";
import { useNow } from "@/lib/use-now";
import { TaskRow } from "./task-row";

/**
 * Everything with a date in one list: dated tasks and coming exams. Nothing
 * is kept here; it is another way of looking at the other two areas.
 */
export function DeadlinesView({
  data,
  workspaceId,
}: {
  data: AtlasData;
  workspaceId: string;
}) {
  const tasks = useTasks(data, workspaceId);
  const exams = useExams(data, workspaceId);
  const update = useUpdateTask(data, workspaceId);
  const today = toLocalDate(useNow());
  const groups = deadlines(tasks.data ?? [], exams.data ?? [], today);
  const error = tasks.error ?? exams.error ?? update.error;
  const isEmpty =
    tasks.isSuccess &&
    exams.isSuccess &&
    groups.overdue.length + groups.thisWeek.length + groups.later.length === 0;

  function row(item: Deadline, overdue = false) {
    if (item.kind === "task") {
      return (
        <TaskRow
          key={item.task.id}
          task={item.task}
          today={today}
          overdue={overdue}
          onToggle={() => update.mutate({ id: item.task.id, status: "done" })}
        />
      );
    }
    return (
      <li key={item.exam.id} className="flex items-center gap-3 py-2 text-sm">
        {/* Sits where a task has its tick box, so the titles line up. */}
        <span
          aria-hidden="true"
          className="flex size-4 shrink-0 items-center justify-center"
        >
          <span className="size-1.5 rounded-full bg-signal" />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {item.exam.subject}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
          <span>Exam</span>
          <span className="tabular-nums">
            {describeDueDate(item.date, today)}
            {item.time && ` at ${item.time}`}
          </span>
        </span>
      </li>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-12 pt-8 pb-16">
      <h1 className="font-heading text-4xl tracking-tight">Deadlines</h1>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error.message}
        </p>
      )}
      {isEmpty && (
        <p className="mt-10 text-sm text-muted-foreground">
          Nothing with a date is coming up. Tasks with a due date and exams
          appear here.
        </p>
      )}

      <Group title="Overdue">
        {groups.overdue.map((item) => row(item, true))}
      </Group>
      <Group title="This week">
        {groups.thisWeek.map((item) => row(item))}
      </Group>
      <Group title="Later">{groups.later.map((item) => row(item))}</Group>
    </section>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode[];
}) {
  if (children.length === 0) return null;
  return (
    <div className="mt-10">
      <h2 className="font-heading text-xl">{title}</h2>
      <ul aria-label={title} className="mt-2 divide-y divide-border">
        {children}
      </ul>
    </div>
  );
}
