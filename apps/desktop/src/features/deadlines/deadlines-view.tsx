import {
  type AtlasData,
  type Deadline,
  describeDueDate,
  groupDeadlines,
  toLocalDate,
  useCreateDeadline,
  useDeadlines,
  useDeleteDeadline,
  useUpdateDeadline,
} from "@atlas/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeadlineForm } from "./deadline-form";

export function DeadlinesView({
  data,
  workspaceId,
}: {
  data: AtlasData;
  workspaceId: string;
}) {
  const deadlines = useDeadlines(data, workspaceId);
  const create = useCreateDeadline(data, workspaceId);
  const update = useUpdateDeadline(data, workspaceId);
  const remove = useDeleteDeadline(data, workspaceId);
  const [editingId, setEditingId] = useState<string>();
  const [showDone, setShowDone] = useState(false);
  // Remounting the add form clears its title after a deadline is added.
  const [addFormKey, setAddFormKey] = useState(0);

  const today = toLocalDate(new Date());
  const groups = groupDeadlines(deadlines.data ?? [], today);
  const error = deadlines.error ?? create.error ?? update.error ?? remove.error;
  const isEmpty = deadlines.isSuccess && deadlines.data.length === 0;

  function renderRows(items: Deadline[], overdue = false) {
    return items.map((deadline) =>
      deadline.id === editingId ? (
        <li key={deadline.id} className="rounded-lg border border-border p-4">
          <DeadlineForm
            initial={deadline}
            submitLabel="Save"
            pending={update.isPending || remove.isPending}
            onSubmit={(draft) =>
              update.mutate(
                { id: deadline.id, ...draft },
                { onSuccess: () => setEditingId(undefined) },
              )
            }
            onCancel={() => setEditingId(undefined)}
            onDelete={() => remove.mutate(deadline.id)}
          />
        </li>
      ) : (
        <li key={deadline.id} className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={deadline.completed}
            aria-label={`Mark ${deadline.title} as ${deadline.completed ? "not done" : "done"}`}
            onChange={() =>
              update.mutate({
                id: deadline.id,
                completed: !deadline.completed,
              })
            }
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
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${deadline.title}`}
            onClick={() => setEditingId(deadline.id)}
          >
            Edit
          </Button>
        </li>
      ),
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-12 pt-10 pb-16">
      <h1 className="font-heading text-4xl tracking-tight">Deadlines</h1>

      <div className="mt-8">
        <DeadlineForm
          key={addFormKey}
          initial={{ title: "", dueDate: today, dueTime: null }}
          submitLabel="Add deadline"
          pending={create.isPending}
          onSubmit={(draft) =>
            create.mutate(
              { id: crypto.randomUUID(), ...draft },
              { onSuccess: () => setAddFormKey((key) => key + 1) },
            )
          }
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error.message}
        </p>
      )}

      {isEmpty && (
        <p className="mt-10 text-sm text-muted-foreground">
          No deadlines yet. Add the first one above.
        </p>
      )}

      <Group title="Overdue" count={groups.overdue.length}>
        {renderRows(groups.overdue, true)}
      </Group>
      <Group title="Today" count={groups.today.length}>
        {renderRows(groups.today)}
      </Group>
      <Group title="Upcoming" count={groups.upcoming.length}>
        {renderRows(groups.upcoming)}
      </Group>

      {groups.done.length > 0 && (
        <div className="mt-10">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showDone}
            onClick={() => setShowDone((shown) => !shown)}
          >
            {showDone ? "Hide" : "Show"} done ({groups.done.length})
          </Button>
          {showDone && (
            <ul aria-label="Done" className="mt-1 divide-y divide-border">
              {renderRows(groups.done)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) {
    return null;
  }
  return (
    <div className="mt-10">
      <h2 className="font-heading text-xl">{title}</h2>
      <ul aria-label={title} className="mt-2 divide-y divide-border">
        {children}
      </ul>
    </div>
  );
}
