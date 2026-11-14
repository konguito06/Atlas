import { type Deadline, describeDueDate } from "@atlas/core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeadlineRowProps {
  deadline: Deadline;
  /** Today's date, YYYY-MM-DD, to phrase the due date against. */
  today: string;
  overdue?: boolean;
  onToggle: () => void;
  /** Leave out where a deadline can be ticked but not edited. */
  onEdit?: () => void;
}

/** One deadline in a list: a tick box, its title and when it is due. */
export function DeadlineRow({
  deadline,
  today,
  overdue,
  onToggle,
  onEdit,
}: DeadlineRowProps) {
  return (
    <li className="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        checked={deadline.completed}
        aria-label={`Mark ${deadline.title} as ${deadline.completed ? "not done" : "done"}`}
        onChange={onToggle}
        className="size-4 shrink-0 accent-primary"
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          deadline.completed && "text-muted-foreground line-through",
        )}
      >
        {deadline.title}
      </span>
      <span
        className={cn(
          "shrink-0 text-sm text-muted-foreground tabular-nums",
          overdue && "text-destructive",
        )}
      >
        {describeDueDate(deadline.dueDate, today)}
        {deadline.dueTime && ` at ${deadline.dueTime}`}
      </span>
      {onEdit && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Edit ${deadline.title}`}
          onClick={onEdit}
        >
          Edit
        </Button>
      )}
    </li>
  );
}
