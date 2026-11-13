import {
  DEADLINE_TITLE_MAX_LENGTH,
  type DeadlineDraft,
  validateDeadline,
} from "@atlas/core";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeadlineFormProps {
  initial: DeadlineDraft;
  submitLabel: string;
  pending: boolean;
  /** Called with a draft that has passed validation. */
  onSubmit: (draft: DeadlineDraft) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

/** The fields for one deadline, used both to add and to edit. */
export function DeadlineForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
  onDelete,
}: DeadlineFormProps) {
  const titleId = useId();
  const dateId = useId();
  const timeId = useId();
  const errorId = useId();
  const [title, setTitle] = useState(initial.title);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [dueTime, setDueTime] = useState(initial.dueTime ?? "");
  const [error, setError] = useState<string>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateDeadline({
      title,
      dueDate,
      dueTime: dueTime || null,
    });
    if (result.ok) {
      setError(undefined);
      onSubmit(result.value);
    } else {
      setError(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-3">
      <div className="grid grid-cols-[1fr_9.5rem_7rem] gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={titleId}>Title</Label>
          <Input
            id={titleId}
            value={title}
            maxLength={DEADLINE_TITLE_MAX_LENGTH}
            placeholder="Essay draft"
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={dateId}>Date</Label>
          <Input
            id={dateId}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={timeId}>Time (optional)</Label>
          <Input
            id={timeId}
            type="time"
            value={dueTime}
            onChange={(event) => setDueTime(event.target.value)}
          />
        </div>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="ml-auto"
            disabled={pending}
            onClick={onDelete}
          >
            Delete deadline
          </Button>
        )}
      </div>
    </form>
  );
}
