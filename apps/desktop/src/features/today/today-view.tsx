import {
  type AtlasData,
  type Deadline,
  DISPLAY_LOCALE,
  dayProgress,
  daySpan,
  deadlinesDueSoon,
  describeMinutes,
  describeNextUp,
  greeting,
  minutesOfDay,
  minutesToTime,
  todaysEntries,
  toLocalDate,
  useAllTimetableEntries,
  useDeadlines,
  useDocuments,
  useTimetables,
  useUpdateDeadline,
  weekOverview,
} from "@atlas/core";
import { Button } from "@/components/ui/button";
import { DeadlineRow } from "@/features/deadlines/deadline-row";
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
  workspaceId: string;
  /** Jumps to the page where the full list lives. */
  onOpen: (page: "deadlines" | "timetable" | "documents") => void;
  onOpenDocument: (documentId: string) => void;
}

/** The station: everything about the day and the week on one screen. */
export function TodayView({
  data,
  workspaceId,
  onOpen,
  onOpenDocument,
}: TodayViewProps) {
  const now = useNow(5_000);
  const today = toLocalDate(now);
  const timetables = useTimetables(data, workspaceId);
  const allEntries = useAllTimetableEntries(data, timetables.data ?? []);
  const deadlines = useDeadlines(data, workspaceId);
  const documents = useDocuments(data, workspaceId);
  const update = useUpdateDeadline(data, workspaceId);

  const entries = todaysEntries(timetables.data ?? [], allEntries.entries, now);
  const span = daySpan(entries);
  const progress = dayProgress(entries, now);
  const soon = deadlinesDueSoon(deadlines.data ?? [], today);
  const week = weekOverview(
    timetables.data ?? [],
    allEntries.entries,
    deadlines.data ?? [],
    now,
  );
  const nothingDue =
    soon.overdue.length + soon.today.length + soon.thisWeek.length === 0;
  const hasNoTimetable = timetables.isSuccess && timetables.data.length === 0;
  const severalTimetables = (timetables.data?.length ?? 0) > 1;
  const recentDocuments = documents.data?.slice(0, 4) ?? [];
  const error =
    timetables.error ??
    allEntries.error ??
    deadlines.error ??
    documents.error ??
    update.error;

  function row(deadline: Deadline, overdue = false) {
    return (
      <DeadlineRow
        key={deadline.id}
        deadline={deadline}
        today={today}
        overdue={overdue}
        onToggle={() =>
          update.mutate({ id: deadline.id, completed: !deadline.completed })
        }
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-10 pt-14 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{greeting(now)}</p>
          <h1 className="mt-1 font-heading text-4xl leading-[1.1] tracking-tight">
            {weekdayFormat.format(now)},{" "}
            <span className="text-muted-foreground">
              {dateFormat.format(now)}
            </span>
          </h1>
        </div>
        <p className="text-7xl leading-none font-extralight tracking-tight tabular-nums">
          <span className="sr-only">The time is </span>
          {minutesToTime(minutesOfDay(now))}
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error.message}
        </p>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-12">
        <Panel title="On today" className="lg:col-span-8">
          {hasNoTimetable ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                You have no timetable yet.
              </p>
              <Button variant="outline" onClick={() => onOpen("timetable")}>
                Set up a timetable
              </Button>
            </div>
          ) : (
            <p className="text-sm">{describeNextUp(entries, now)}</p>
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
                    "flex items-baseline gap-4 py-2 text-sm",
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
                    <span className="shrink-0 font-medium text-signal">
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
        </Panel>

        <Panel title="At a glance" className="lg:col-span-4">
          <div className="flex justify-center">
            <DayRing
              fraction={progress.fraction}
              hasEntries={entries.length > 0}
            />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
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
        </Panel>

        <Panel title="Due soon" className="lg:col-span-5">
          {deadlines.isSuccess && nothingDue ? (
            <p className="text-sm text-muted-foreground">
              Nothing is due in the next week.
            </p>
          ) : (
            <ul aria-label="Due soon" className="-mt-2 divide-y divide-border">
              {soon.overdue.map((deadline) => row(deadline, true))}
              {soon.today.map((deadline) => row(deadline))}
              {soon.thisWeek.map((deadline) => row(deadline))}
            </ul>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onOpen("deadlines")}
          >
            {deadlines.data?.length ? "All deadlines" : "Add a deadline"}
          </Button>
        </Panel>

        <Panel title="This week" className="lg:col-span-4">
          <WeekStrip days={week} />
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onOpen("timetable")}
          >
            Open timetable
          </Button>
        </Panel>

        <Panel title="Documents" className="lg:col-span-3">
          {documents.isSuccess && recentDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <ul aria-label="Recent documents" className="-mx-2 -mt-1 grid">
              {recentDocuments.map((document) => (
                <li key={document.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDocument(document.id)}
                    className={cn(
                      "w-full truncate rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                      !document.title && "text-muted-foreground",
                    )}
                  >
                    {document.title || "Untitled"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onOpen("documents")}
          >
            All documents
          </Button>
        </Panel>
      </div>
    </section>
  );
}

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-2xl border border-border bg-card/60 p-5",
        className,
      )}
    >
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
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
