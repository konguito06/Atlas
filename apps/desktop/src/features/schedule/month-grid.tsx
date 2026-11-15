import {
  type CalendarEvent,
  describeView,
  minutesToTime,
  type ScheduleDay,
  WEEKDAYS,
  weekdayName,
} from "@atlas/core";
import { ENTRY_COLORS } from "@/features/timetable/entry-colors";
import { cn } from "@/lib/utils";
import { DayChip, spokenTimes } from "./day-items";

/** How many lines a day shows before it says how many more there are. */
const LINES_PER_DAY = 3;

interface MonthGridProps {
  /** Whole weeks, Monday first, covering the month. */
  days: ScheduleDay[];
  /** The month on show, YYYY-MM; days outside it are dimmed. */
  month: string;
  onOpenDay: (date: string) => void;
  onOpenEvent: (event: CalendarEvent) => void;
}

/**
 * A month as a page of weeks. It shows what is particular to each date:
 * events, exams and due tasks. The weekly timetable is left to the day and
 * week views, where it does not repeat itself across the page.
 */
export function MonthGrid({
  days,
  month,
  onOpenDay,
  onOpenEvent,
}: MonthGridProps) {
  return (
    <div className="grid grid-cols-7 border-r border-b border-border">
      {WEEKDAYS.map((weekday) => (
        <div
          key={weekday}
          className="pb-2 text-center text-xs text-muted-foreground"
        >
          {weekdayName(weekday, "short")}
        </div>
      ))}

      {days.map((day) => {
        const name = describeView("day", day.date);
        const events = day.timed.filter((item) => item.kind === "event");
        const count = events.length + day.allDay.length;
        // Whole-day things first, then the day's events by time.
        const lines = [
          ...day.allDay.map((item) => ({ item, timed: undefined })),
          ...events.map((timed) => ({ item: undefined, timed })),
        ].slice(0, count > LINES_PER_DAY ? LINES_PER_DAY - 1 : LINES_PER_DAY);

        return (
          <div
            key={day.date}
            className={cn(
              "flex min-h-24 min-w-0 flex-col gap-0.5 border-t border-l border-border p-1",
              !day.date.startsWith(month) && "bg-foreground/3",
            )}
          >
            <button
              type="button"
              aria-label={`Open ${name}`}
              aria-current={day.isToday ? "date" : undefined}
              onClick={() => onOpenDay(day.date)}
              className={cn(
                "flex size-6 items-center justify-center self-end rounded-full text-xs tabular-nums outline-none transition-colors hover:bg-foreground/8 focus-visible:ring-3 focus-visible:ring-ring/50",
                !day.date.startsWith(month) && "text-muted-foreground",
                day.isToday &&
                  "bg-accent font-medium text-accent-foreground hover:bg-accent",
              )}
            >
              {Number(day.date.slice(8))}
            </button>

            {count > 0 && (
              <ul aria-label={name} className="grid min-w-0 gap-0.5">
                {lines.map(({ item, timed }) =>
                  item ? (
                    <li key={`${item.kind}-${item.id}`} className="min-w-0">
                      <DayChip item={item} onOpenEvent={onOpenEvent} />
                    </li>
                  ) : (
                    timed?.kind === "event" && (
                      <li key={`event-${timed.id}`} className="min-w-0">
                        <button
                          type="button"
                          aria-label={`${timed.title}, ${spokenTimes(timed)}`}
                          onClick={() => onOpenEvent(timed.event)}
                          className={cn(
                            "block w-full truncate rounded border px-1.5 py-0.5 text-left text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                            ENTRY_COLORS[timed.color].block,
                          )}
                        >
                          <span className="tabular-nums opacity-75">
                            {minutesToTime(timed.startMinute)}
                          </span>{" "}
                          <span className="font-medium">{timed.title}</span>
                        </button>
                      </li>
                    )
                  ),
                )}
                {count > lines.length && (
                  <li className="px-1.5 text-xs text-muted-foreground">
                    {count - lines.length} more
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
