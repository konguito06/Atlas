import {
  type AtlasData,
  type CalendarEvent,
  datesInView,
  describeView,
  SCHEDULE_VIEWS,
  scheduleDays,
  scheduleHours,
  stepDate,
  toLocalDate,
  useAllTimetableEntries,
  useEvents,
  useExams,
  useTasks,
  useTimetables,
  type ScheduleView as View,
} from "@atlas/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { usePreference } from "@/lib/preferences";
import { useNow } from "@/lib/use-now";
import { EventDialog, type EventStart } from "./event-dialog";
import { MonthGrid } from "./month-grid";
import { TimeGrid } from "./time-grid";

const VIEW_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

/**
 * The calendar: a day, a week or a month, showing the weekly timetable,
 * events, exams and task due dates together. Only events are edited here;
 * the rest is shown from where it lives.
 */
export function CalendarView({
  data,
  workspaceId,
}: {
  data: AtlasData;
  workspaceId: string;
}) {
  const now = useNow();
  const today = toLocalDate(now);
  const [view, setView] = usePreference<View>(
    "atlas.schedule-view",
    SCHEDULE_VIEWS,
    "week",
  );
  // The date the view is opened on; the view shows the period around it.
  const [date, setDate] = useState(today);
  // The event being added (where it starts) or edited (which one).
  const [adding, setAdding] = useState<EventStart>();
  const [editingId, setEditingId] = useState<string>();

  const timetables = useTimetables(data, workspaceId);
  const allEntries = useAllTimetableEntries(data, timetables.data ?? []);
  const events = useEvents(data, workspaceId);
  const exams = useExams(data, workspaceId);
  const tasks = useTasks(data, workspaceId);
  const error =
    timetables.error ??
    allEntries.error ??
    events.error ??
    exams.error ??
    tasks.error;

  const dates = datesInView(view, date);
  const days = scheduleDays(
    dates,
    {
      timetables: timetables.data ?? [],
      entries: allEntries.entries,
      events: events.data ?? [],
      exams: exams.data ?? [],
      tasks: tasks.data ?? [],
    },
    today,
  );
  const editing = events.data?.find((event) => event.id === editingId);

  function openDay(target: string) {
    setDate(target);
    setView("day");
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-12 pt-8 pb-16">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
        <h1 className="mr-auto font-heading text-4xl tracking-tight">
          {describeView(view, date)}
        </h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Previous ${view}`}
            onClick={() => setDate(stepDate(view, date, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button variant="outline" onClick={() => setDate(today)}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Next ${view}`}
            onClick={() => setDate(stepDate(view, date, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
        <SegmentedControl
          label="View"
          value={view}
          options={VIEW_OPTIONS}
          onChange={setView}
        />
        <Button
          onClick={() =>
            setAdding({
              // The day on screen, or today when the period includes it.
              date: view === "day" || !dates.includes(today) ? date : today,
              startMinute: 9 * 60,
            })
          }
        >
          Add event
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error.message}
        </p>
      )}

      <div className="mt-8">
        {view === "month" ? (
          <MonthGrid
            days={days}
            month={date.slice(0, 7)}
            onOpenDay={openDay}
            onOpenEvent={(event: CalendarEvent) => setEditingId(event.id)}
          />
        ) : (
          <TimeGrid
            days={days}
            hours={scheduleHours(days, timetables.data ?? [])}
            now={now}
            onOpenDay={view === "week" ? openDay : undefined}
            onAddAt={(target, hour) =>
              setAdding({ date: target, startMinute: hour * 60 })
            }
            onOpenEvent={(event) => setEditingId(event.id)}
          />
        )}
      </div>

      {adding && (
        <EventDialog
          data={data}
          workspaceId={workspaceId}
          start={adding}
          onClose={() => setAdding(undefined)}
        />
      )}
      {editing && (
        <EventDialog
          key={editing.id}
          data={data}
          workspaceId={workspaceId}
          event={editing}
          onClose={() => setEditingId(undefined)}
        />
      )}
    </section>
  );
}
