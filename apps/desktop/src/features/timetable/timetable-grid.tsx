import {
  layoutDay,
  minutesToTime,
  type Timetable,
  type TimetableEntry,
  type Weekday,
  weekdayName,
} from "@atlas/core";
import { cn } from "@/lib/utils";
import { ENTRY_COLORS } from "./entry-colors";

const HOUR_HEIGHT = 52;

interface TimetableGridProps {
  timetable: Timetable;
  /** Only entries the timetable's days and hours can show. */
  entries: TimetableEntry[];
  onAddAt: (day: Weekday, hour: number) => void;
  onOpenEntry: (entry: TimetableEntry) => void;
}

/** The week as columns and the hours as rows, with entries placed by time. */
export function TimetableGrid({
  timetable,
  entries,
  onAddAt,
  onOpenEntry,
}: TimetableGridProps) {
  const firstMinute = timetable.startHour * 60;
  const lastMinute = timetable.endHour * 60;
  const hours = Array.from(
    { length: timetable.endHour - timetable.startHour },
    (_, index) => timetable.startHour + index,
  );
  const height = hours.length * HOUR_HEIGHT;
  const offset = (minute: number) =>
    ((minute - firstMinute) / 60) * HOUR_HEIGHT;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[36rem]"
        style={{
          gridTemplateColumns: `3.5rem repeat(${timetable.days.length}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {timetable.days.map((day) => (
          <div key={day} className="pb-2 text-center text-sm font-medium">
            {weekdayName(day, "short")}
          </div>
        ))}

        <div className="relative" style={{ height }}>
          {[...hours, timetable.endHour].map((hour) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
              style={{ top: offset(hour * 60) }}
            >
              {minutesToTime(hour * 60)}
            </span>
          ))}
        </div>

        {timetable.days.map((day) => (
          <div
            key={day}
            className="relative border-b border-l border-border last:border-r"
            style={{ height }}
          >
            {hours.map((hour) => (
              <button
                key={hour}
                type="button"
                aria-label={`Add an entry on ${weekdayName(day)} at ${minutesToTime(hour * 60)}`}
                onClick={() => onAddAt(day, hour)}
                className="absolute inset-x-0 border-t border-border outline-none hover:bg-muted/70 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
                style={{ top: offset(hour * 60), height: HOUR_HEIGHT }}
              />
            ))}

            {layoutDay(entries.filter((entry) => entry.day === day)).map(
              ({ entry, lane, lanes }) => {
                // Clip entries that run past the hours the grid shows.
                const top = offset(Math.max(entry.startMinute, firstMinute));
                const bottom = offset(Math.min(entry.endMinute, lastMinute));
                const times = `${minutesToTime(entry.startMinute)} to ${minutesToTime(entry.endMinute)}`;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-label={`${entry.title}, ${weekdayName(day)} ${times}${entry.location ? `, ${entry.location}` : ""}`}
                    onClick={() => onOpenEntry(entry)}
                    className={cn(
                      "absolute overflow-hidden rounded-md border px-1.5 py-1 text-left text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      ENTRY_COLORS[entry.color].block,
                    )}
                    style={{
                      top: top + 1,
                      height: bottom - top - 2,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                  >
                    <span className="block truncate font-medium">
                      {entry.title}
                    </span>
                    <span className="block truncate tabular-nums opacity-75">
                      {minutesToTime(entry.startMinute)}–
                      {minutesToTime(entry.endMinute)}
                    </span>
                    {entry.location && (
                      <span className="block truncate opacity-75">
                        {entry.location}
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
