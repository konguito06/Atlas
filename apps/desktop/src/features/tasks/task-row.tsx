import {
  describeDueDate,
  PRIORITY_LABELS,
  type Project,
  type Task,
} from "@atlas/core";
import { ENTRY_COLORS } from "@/features/timetable/entry-colors";
import { cn } from "@/lib/utils";

interface TaskRowProps {
  task: Task;
  /** Today's date, YYYY-MM-DD, to phrase the due date against. */
  today: string;
  overdue?: boolean;
  project?: Project;
  /** How many of its subtasks are done, when it has any. */
  subtasks?: { done: number; total: number };
  onToggle: () => void;
  /** Leave out where a task can be ticked but not opened. */
  onOpen?: () => void;
}

/** One task in a list: a tick box, its title and what matters about it. */
export function TaskRow({
  task,
  today,
  overdue,
  project,
  subtasks,
  onToggle,
  onOpen,
}: TaskRowProps) {
  const done = task.status === "done";
  const title = (
    <span
      className={cn(
        "block truncate",
        done && "text-muted-foreground line-through",
      )}
    >
      {task.title}
    </span>
  );

  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={done}
        aria-label={`Mark ${task.title} as ${done ? "not done" : "done"}`}
        onChange={onToggle}
        className="size-4 shrink-0 accent-primary"
      />
      {onOpen ? (
        <button
          type="button"
          aria-label={`Open ${task.title}`}
          onClick={onOpen}
          className="min-w-0 flex-1 rounded-sm text-left outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {title}
        </button>
      ) : (
        <span className="min-w-0 flex-1">{title}</span>
      )}

      <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
        {task.status === "doing" && <span>In progress</span>}
        {subtasks && subtasks.total > 0 && (
          <span className="tabular-nums">
            {subtasks.done}/{subtasks.total}
          </span>
        )}
        {task.priority !== "none" && (
          <span
            className={cn(
              task.priority === "high" && "font-medium text-foreground",
            )}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
        )}
        {project && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                ENTRY_COLORS[project.color].swatch,
              )}
            />
            {project.name}
          </span>
        )}
        {task.dueDate && (
          <span className={cn("tabular-nums", overdue && "text-destructive")}>
            {describeDueDate(task.dueDate, today)}
            {task.dueTime && ` at ${task.dueTime}`}
          </span>
        )}
      </span>
    </li>
  );
}
