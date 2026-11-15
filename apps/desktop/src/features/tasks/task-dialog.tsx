import {
  type AtlasData,
  EMPTY_TASK_DRAFT,
  type Exam,
  PRIORITY_LABELS,
  type Project,
  STATUS_LABELS,
  subtasksOf,
  TASK_NOTES_MAX_LENGTH,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TITLE_MAX_LENGTH,
  type Task,
  type TaskPriority,
  type TaskStatus,
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
  validateTask,
} from "@atlas/core";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TaskDialogProps {
  data: AtlasData;
  workspaceId: string;
  task: Task;
  /** Every task, to find this one's subtasks. */
  tasks: Task[];
  projects: Project[];
  /** Exams the task can be linked to. The link is always optional. */
  exams: Exam[];
  onClose: () => void;
}

/**
 * Everything about one task. Its fields save together with Save; subtasks
 * save as they are added, ticked or removed. Mount it to open it.
 */
export function TaskDialog({
  data,
  workspaceId,
  task,
  tasks,
  projects,
  exams,
  onClose,
}: TaskDialogProps) {
  const ids = {
    title: useId(),
    notes: useId(),
    date: useId(),
    time: useId(),
    priority: useId(),
    status: useId(),
    project: useId(),
    exam: useId(),
  };
  const create = useCreateTask(data, workspaceId);
  const update = useUpdateTask(data, workspaceId);
  const remove = useDeleteTask(data, workspaceId);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task.dueTime ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [projectId, setProjectId] = useState(task.projectId ?? "");
  const [examId, setExamId] = useState(task.examId ?? "");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [error, setError] = useState<string>();

  const subtasks = subtasksOf(tasks, task.id);
  const pending = update.isPending || remove.isPending;
  const message =
    error ??
    (update.error ?? remove.error ?? create.error)?.message ??
    undefined;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateTask({
      title,
      notes,
      priority,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      projectId: projectId || null,
      examId: examId || null,
      parentId: task.parentId,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(undefined);
    const { parentId: _parentId, ...fields } = result.value;
    update.mutate(
      // Only send the status when it changed, so the finish time is kept.
      {
        id: task.id,
        ...fields,
        ...(status !== task.status && { status }),
      },
      { onSuccess: onClose },
    );
  }

  function addSubtask() {
    const result = validateTask({
      ...EMPTY_TASK_DRAFT,
      title: subtaskTitle,
      parentId: task.id,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(undefined);
    create.mutate(
      { id: crypto.randomUUID(), ...result.value },
      { onSuccess: () => setSubtaskTitle("") },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Task</DialogTitle>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={ids.title}>Title</Label>
            <Input
              id={ids.title}
              value={title}
              maxLength={TASK_TITLE_MAX_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={ids.notes}>Notes</Label>
            <Textarea
              id={ids.notes}
              value={notes}
              maxLength={TASK_NOTES_MAX_LENGTH}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={ids.date}>Due date</Label>
              <Input
                id={ids.date}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={ids.time}>Time</Label>
              <Input
                id={ids.time}
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={ids.priority}>Priority</Label>
              <NativeSelect
                id={ids.priority}
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
                }
              >
                {TASK_PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {PRIORITY_LABELS[option]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={ids.status}>Status</Label>
              <NativeSelect
                id={ids.status}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TaskStatus)
                }
              >
                {TASK_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {STATUS_LABELS[option]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={ids.project}>Project</Label>
              <NativeSelect
                id={ids.project}
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {exams.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor={ids.exam}>For an exam (optional)</Label>
              <NativeSelect
                id={ids.exam}
                value={examId}
                onChange={(event) => setExamId(event.target.value)}
              >
                <option value="">No exam</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.subject}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="grid gap-1.5">
            <p className="text-sm leading-none font-medium">Subtasks</p>
            {subtasks.length > 0 && (
              <ul aria-label="Subtasks" className="grid gap-1">
                {subtasks.map((subtask) => (
                  <li key={subtask.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={subtask.status === "done"}
                      aria-label={`Mark ${subtask.title} as ${subtask.status === "done" ? "not done" : "done"}`}
                      onChange={() =>
                        update.mutate({
                          id: subtask.id,
                          status: subtask.status === "done" ? "todo" : "done",
                        })
                      }
                      className="atlas-check"
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        subtask.status === "done" &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {subtask.title}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${subtask.title}`}
                      onClick={() => remove.mutate(subtask.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                aria-label="New subtask"
                value={subtaskTitle}
                maxLength={TASK_TITLE_MAX_LENGTH}
                placeholder="Add a subtask"
                onChange={(event) => setSubtaskTitle(event.target.value)}
                onKeyDown={(event) => {
                  // Enter adds the subtask instead of saving the whole task.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubtask();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={create.isPending}
                onClick={addSubtask}
              >
                Add subtask
              </Button>
            </div>
          </div>

          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              disabled={pending}
              onClick={() => remove.mutate(task.id, { onSuccess: onClose })}
            >
              Delete task
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
