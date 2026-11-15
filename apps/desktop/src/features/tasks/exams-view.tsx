import {
  type AtlasData,
  daysBetween,
  describeCountdown,
  type Exam,
  examTasks,
  formatLocalDate,
  splitExams,
  toLocalDate,
  useExams,
  useTasks,
} from "@atlas/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { ExamDialog } from "./exam-dialog";

/** Exams, soonest first, each with how long is left. */
export function ExamsView({
  data,
  workspaceId,
}: {
  data: AtlasData;
  workspaceId: string;
}) {
  const exams = useExams(data, workspaceId);
  const tasks = useTasks(data, workspaceId);
  // "new" while adding one; otherwise the id of the exam that is open.
  const [open, setOpen] = useState<string>();
  const today = toLocalDate(useNow());
  const { upcoming, past } = splitExams(exams.data ?? [], today);
  const openExam = exams.data?.find((exam) => exam.id === open);
  const error = exams.error ?? tasks.error;

  function row(exam: Exam) {
    const linked = examTasks(tasks.data ?? [], exam.id);
    const days = daysBetween(today, exam.date);
    return (
      <li key={exam.id} className="flex items-baseline gap-4 py-3 text-sm">
        <button
          type="button"
          aria-label={`Open ${exam.subject}`}
          onClick={() => setOpen(exam.id)}
          className="min-w-0 flex-1 truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {exam.subject}
        </button>
        {linked.tasks.length > 0 && (
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {linked.done} of {linked.tasks.length} tasks done
          </span>
        )}
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {[
            formatLocalDate(exam.date, today) +
              (exam.time ? ` at ${exam.time}` : ""),
            exam.location,
          ]
            .filter(Boolean)
            .join(", ")}
        </span>
        <span
          className={cn(
            "flex w-24 shrink-0 items-center justify-end gap-1.5 tabular-nums",
            days >= 0 && days <= 7 ? "font-medium" : "text-muted-foreground",
          )}
        >
          {days >= 0 && days <= 7 && (
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-signal"
            />
          )}
          {describeCountdown(exam.date, today)}
        </span>
      </li>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-12 pt-8 pb-16">
      <div className="flex flex-wrap items-end gap-2">
        <h1 className="mr-auto font-heading text-4xl tracking-tight">Exams</h1>
        <Button onClick={() => setOpen("new")}>Add exam</Button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error.message}
        </p>
      )}

      {exams.isSuccess && exams.data.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">
          No exams yet. Add one with its date to start the countdown.
        </p>
      )}

      {upcoming.length > 0 && (
        <div className="mt-10">
          <h2 className="font-heading text-xl">Upcoming</h2>
          <ul aria-label="Upcoming" className="mt-2 divide-y divide-border">
            {upcoming.map(row)}
          </ul>
        </div>
      )}
      {past.length > 0 && (
        <div className="mt-10">
          <h2 className="font-heading text-xl">Past</h2>
          <ul
            aria-label="Past"
            className="mt-2 divide-y divide-border text-muted-foreground"
          >
            {past.map(row)}
          </ul>
        </div>
      )}

      {(open === "new" || openExam) && (
        <ExamDialog
          key={open}
          data={data}
          workspaceId={workspaceId}
          exam={openExam}
          tasks={tasks.data ?? []}
          onClose={() => setOpen(undefined)}
        />
      )}
    </section>
  );
}
