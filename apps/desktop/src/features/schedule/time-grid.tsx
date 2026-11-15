import {
  type CalendarEvent,
  describeView,
  layoutDay,
  minutesOfDay,
  minutesToTime,
  type ScheduleDay,
  weekdayName,
} from "@atlas/core";
import { ENTRY_COLORS } from "@/features/timetable/entry-colors";
import { cn } from "@/lib/utils";
import { DayChip, spokenTimes } from "./day-items";

const HOUR_HEIGHT = 48;

interface TimeGridProps {
  /** One column per day: one for the day view, seven for the week. */
  days: ScheduleDay[];
  hours: { startHour: number; endHour: number };
  now: Date;
  /** Leave out where the day is already the whole view. */
  onOpenDay?: (date: string) => void;
  onAddAt: (date: string, hour: number) => void;
  onOpenEvent: (event: CalendarEvent) => void;
}

/** Days as columns and hours as rows, with everything timed placed by time. */
export function TimeGrid({
  days,
  hours: { startHour, endHour },
  now,
  onOpenDay,
  onAddAt,
  onOpenEvent,
}: TimeGridProps) {
  const firstMinute = startHour * 60;
  const lastMinute = endHour * 60;
  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index,
  );
  const height = hours.length * HOUR_HEIGHT;
  const offset = (minute: number) =>
    ((minute - firstMinute) / 60) * HOUR_HEIGHT;
  const nowMinute = minutesOfDay(now);
  const hasAllDay = days.some((day) => day.allDay.length > 0);

  return (
    <div className="overflow-x-auto">
      <div
        className={cn("grid", days.length > 1 && "min-w-[40rem]")}
        style={{
          gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {days.map((day) => {
          const name = describeView("day", day.date);
          const label = (
            <>
              <span className="text-xs text-muted-foreground">
                {weekdayName(day.weekday, "short")}
              </span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm tabular-nums",
                  day.isToday && "bg-accent font-medium text-accent-foreground",
                )}
              >
                {Number(day.date.slice(8))}
              </span>
            </>
          );
          return (
            <div key={day.date} className="flex justify-center pb-2">
              {onOpenDay ? (
                <button
                  type="button"
                  aria-label={`Open ${name}`}
                  aria-current={day.isToday ? "date" : undefined}
                  onClick={() => onOpenDay(day.date)}
                  className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 outline-none transition-colors hover:bg-foreground/6 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {label}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-0.5 py-1">
                  {label}
                </div>
              )}
            </div>
          );
        })}

        {hasAllDay && (
          <>
            <div className="pt-1.5 pr-2 text-right text-xs text-muted-foreground">
              All day
            </div>
            {days.map((day) => (
              <ul
                key={day.date}
                aria-label={`All day, ${describeView("day", day.date)}`}
                className="grid min-w-0 content-start gap-0.5 border-l border-border px-0.5 py-1 last:border-r"
              >
                {day.allDay.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="min-w-0">
                    <DayChip item={item} onOpenEvent={onOpenEvent} />
                  </li>
                ))}
              </ul>
            ))}
          </>
        )}

        <div className="relative" style={{ height }}>
          {[...hours, endHour].map((hour) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
              style={{ top: offset(hour * 60) }}
            >
              {minutesToTime(hour * 60)}
            </span>
          ))}
        </div>

        {days.map((day) => {
          const name = describeView("day", day.date);
          return (
            <div
              key={day.date}
              className="relative border-b border-l border-border last:border-r"
              style={{ height }}
            >
              {hours.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  aria-label={`Add an event on ${name} at ${minutesToTime(hour * 60)}`}
                  onClick={() => onAddAt(day.date, hour)}
                  className="absolute inset-x-0 border-t border-border outline-none hover:bg-foreground/4 focus-visible:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
                  style={{ top: offset(hour * 60), height: HOUR_HEIGHT }}
                />
              ))}

              {/* Lets clicks through to the hour behind, except on an item. */}
              <ul
                aria-label={name}
                className="pointer-events-none absolute inset-0"
              >
                {layoutDay(day.timed).map(({ entry: item, lane, lanes }) => {
                  // Clip what runs past the hours the grid shows.
                  const top = offset(Math.max(item.startMinute, firstMinute));
                  const bottom = offset(Math.min(item.endMinute, lastMinute));
                  const content = (
                    <>
                      <span className="block truncate font-medium">
                        {item.title}
                      </span>
                      <span className="block truncate tabular-nums opacity-75">
                        {minutesToTime(item.startMinute)}–
                        {minutesToTime(item.endMinute)}
                      </span>
                      {item.location && (
                        <span className="block truncate opacity-75">
                          {item.location}
                        </span>
                      )}
                    </>
                  );
                  const block = cn(
                    "flex h-full w-full flex-col justify-start overflow-hidden rounded-md border px-1.5 py-1 text-left text-xs",
                    ENTRY_COLORS[item.color].block,
                  );
                  return (
                    <li
                      key={`${item.kind}-${item.id}`}
                      className="pointer-events-auto absolute"
                      style={{
                        top: top + 1,
                        height: bottom - top - 2,
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                      }}
                    >
                      {item.kind === "event" ? (
                        <button
                          type="button"
                          aria-label={`${item.title}, ${spokenTimes(item)}`}
                          onClick={() => onOpenEvent(item.event)}
                          className={cn(
                            block,
                            "outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                          )}
                        >
                          {content}
                        </button>
                      ) : (
                        // From the weekly timetable: shown here, changed there.
                        <div
                          className={cn(block, "border-dashed")}
                          title={`From the timetable “${item.timetableName}”`}
                        >
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {day.isToday &&
                nowMinute >= firstMinute &&
                nowMinute <= lastMinute && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 z-[1] h-0.5 -translate-y-1/2 bg-signal"
                    style={{ top: offset(nowMinute) }}
                  >
                    <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-signal" />
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
