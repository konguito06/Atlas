import {
  type AtlasData,
  EMPTY_TASK_DRAFT,
  EXAM_LOCATION_MAX_LENGTH,
  EXAM_NOTES_MAX_LENGTH,
  EXAM_SUBJECT_MAX_LENGTH,
  type Exam,
  examTasks,
  TASK_TITLE_MAX_LENGTH,
  type Task,
  useCreateExam,
  useCreateTask,
  useDeleteExam,
  useUpdateExam,
  useUpdateTask,
  validateExam,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ExamDialogProps {
  data: AtlasData;
  workspaceId: string;
  /** The exam to edit; leave out to add a new one. */
  exam?: Exam;
  /** Every task, to find the ones linked to this exam. */
  tasks: Task[];
  onClose: () => void;
}

/**
 * One exam. Only the subject and date are needed. Once it exists, tasks can
 * be added to it for those who want to plan their preparation; they save as
 * they are added or ticked. Mount it to open it.
 */
export function ExamDialog({
  data,
  workspaceId,
  exam,
  tasks,
  onClose,
}: ExamDialogProps) {
  const ids = {
    subject: useId(),
    date: useId(),
    time: useId(),
    location: useId(),
    notes: useId(),
  };
  const create = useCreateExam(data, workspaceId);
  const update = useUpdateExam(data, workspaceId);
  const remove = useDeleteExam(data, workspaceId);
  const createTask = useCreateTask(data, workspaceId);
  const updateTask = useUpdateTask(data, workspaceId);
  const [subject, setSubject] = useState(exam?.subject ?? "");
  const [date, setDate] = useState(exam?.date ?? "");
  const [time, setTime] = useState(exam?.time ?? "");
  const [location, setLocation] = useState(exam?.location ?? "");
  const [notes, setNotes] = useState(exam?.notes ?? "");
  const [taskTitle, setTaskTitle] = useState("");
  const [error, setError] = useState<string>();

  const linked = exam ? examTasks(tasks, exam.id).tasks : [];
  const pending = create.isPending || update.isPending || remove.isPending;
  const message =
    error ??
    (
      create.error ??
      update.error ??
      remove.error ??
      createTask.error ??
      updateTask.error
    )?.message;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateExam({
      subject,
      date,
      time: time || null,
      location,
      notes,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(undefined);
    if (exam) {
      update.mutate({ id: exam.id, ...result.value }, { onSuccess: onClose });
    } else {
      create.mutate(
        { id: crypto.randomUUID(), ...result.value },
        { onSuccess: onClose },
      );
    }
  }

  function addTask() {
    if (!exam) return;
    const result = validateTask({
      ...EMPTY_TASK_DRAFT,
      title: taskTitle,
      examId: exam.id,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(undefined);
    createTask.mutate(
      { id: crypto.randomUUID(), ...result.value },
      { onSuccess: () => setTaskTitle("") },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{exam ? "Exam" : "Add exam"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={ids.subject}>Subject</Label>
            <Input
              id={ids.subject}
              value={subject}
              maxLength={EXAM_SUBJECT_MAX_LENGTH}
              placeholder="Algorithms"
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={ids.date}>Date</Label>
              <Input
                id={ids.date}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={ids.time}>Time (optional)</Label>
              <Input
                id={ids.time}
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={ids.location}>Location (optional)</Label>
            <Input
              id={ids.location}
              value={location}
              maxLength={EXAM_LOCATION_MAX_LENGTH}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={ids.notes}>Notes (optional)</Label>
            <Textarea
              id={ids.notes}
              value={notes}
              maxLength={EXAM_NOTES_MAX_LENGTH}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {exam && (
            <div className="grid gap-1.5">
              <p className="text-sm leading-none font-medium">
                Tasks for this exam (optional)
              </p>
              {linked.length > 0 && (
                <ul aria-label="Tasks for this exam" className="grid gap-1">
                  {linked.map((task) => (
                    <li key={task.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={task.status === "done"}
                        aria-label={`Mark ${task.title} as ${task.status === "done" ? "not done" : "done"}`}
                        onChange={() =>
                          updateTask.mutate({
                            id: task.id,
                            status: task.status === "done" ? "todo" : "done",
                          })
                        }
                        className="atlas-check"
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm",
                          task.status === "done" &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Unlink ${task.title}`}
                        onClick={() =>
                          updateTask.mutate({ id: task.id, examId: null })
                        }
                      >
                        Unlink
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  aria-label="New task for this exam"
                  value={taskTitle}
                  maxLength={TASK_TITLE_MAX_LENGTH}
                  placeholder="Add a task, such as a topic to revise"
                  onChange={(event) => setTaskTitle(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter adds the task; it must not save and close the exam.
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTask();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={createTask.isPending}
                  onClick={addTask}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <DialogFooter>
            {exam && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                disabled={pending}
                onClick={() => remove.mutate(exam.id, { onSuccess: onClose })}
              >
                Delete exam
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {exam ? "Save" : "Add exam"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
