import {
  type AtlasData,
  type Deadline,
  DISPLAY_LOCALE,
  daySpan,
  deadlinesDueSoon,
  describeNextUp,
  minutesToTime,
  todaysEntries,
  toLocalDate,
  useAllTimetableEntries,
  useDeadlines,
  useTimetables,
  useUpdateDeadline,
} from "@atlas/core";
import { Button } from "@/components/ui/button";
import { DeadlineRow } from "@/features/deadlines/deadline-row";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { DayLine } from "./day-line";

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
  onOpen: (page: "deadlines" | "timetable") => void;
}

/** The day at a glance: what is on the timetable and what is due. */
export function TodayView({ data, workspaceId, onOpen }: TodayViewProps) {
  const now = useNow();
  const today = toLocalDate(now);
  const timetables = useTimetables(data, workspaceId);
  const allEntries = useAllTimetableEntries(data, timetables.data ?? []);
  const deadlines = useDeadlines(data, workspaceId);
  const update = useUpdateDeadline(data, workspaceId);

  const entries = todaysEntries(timetables.data ?? [], allEntries.entries, now);
  const span = daySpan(entries);
  const soon = deadlinesDueSoon(deadlines.data ?? [], today);
  const nothingDue =
    soon.overdue.length + soon.today.length + soon.thisWeek.length === 0;
  const hasNoTimetable = timetables.isSuccess && timetables.data.length === 0;
  const severalTimetables = (timetables.data?.length ?? 0) > 1;
  const error =
    timetables.error ?? allEntries.error ?? deadlines.error ?? update.error;

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
    <section className="mx-auto w-full max-w-3xl px-12 pt-14 pb-16">
      <h1 className="font-heading text-5xl leading-[1.1] tracking-tight">
        {weekdayFormat.format(now)},{" "}
        <span className="block text-muted-foreground">
          {dateFormat.format(now)}
        </span>
      </h1>

      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error.message}
        </p>
      )}

      <div className="mt-12">
        <h2 className="font-heading text-xl">On today</h2>
        {hasNoTimetable ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              You have no timetable yet.
            </p>
            <Button variant="outline" onClick={() => onOpen("timetable")}>
              Set up a timetable
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {describeNextUp(entries, now)}
          </p>
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
            className="mt-5 divide-y divide-border"
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
                  <span className="shrink-0 font-medium text-signal">Now</span>
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
      </div>

      <div className="mt-12">
        <h2 className="font-heading text-xl">Due soon</h2>
        {deadlines.isSuccess && nothingDue ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing is due in the next week.
          </p>
        ) : (
          <ul aria-label="Due soon" className="mt-2 divide-y divide-border">
            {soon.overdue.map((deadline) => row(deadline, true))}
            {soon.today.map((deadline) => row(deadline))}
            {soon.thisWeek.map((deadline) => row(deadline))}
          </ul>
        )}
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => onOpen("deadlines")}
        >
          {deadlines.data?.length ? "All deadlines" : "Add a deadline"}
        </Button>
      </div>
    </section>
  );
}
