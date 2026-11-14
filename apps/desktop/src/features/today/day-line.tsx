import { minutesOfDay, minutesToTime, type TodayEntry } from "@atlas/core";
import { ENTRY_COLORS } from "@/features/timetable/entry-colors";
import { cn } from "@/lib/utils";

interface DayLineProps {
  entries: TodayEntry[];
  /** The whole hours the line covers. */
  startHour: number;
  endHour: number;
  now: Date;
}

/**
 * Today drawn as one line from the first hour to the last, with a marker
 * at the current time. The list beside it carries the same information as
 * text, so this drawing is hidden from screen readers.
 */
export function DayLine({ entries, startHour, endHour, now }: DayLineProps) {
  const firstMinute = startHour * 60;
  const totalMinutes = (endHour - startHour) * 60;
  const position = (minute: number) =>
    `${((minute - firstMinute) / totalMinutes) * 100}%`;
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, index) => startHour + index,
  );
  const minute = minutesOfDay(now);
  const nowIsOnTheLine = minute >= firstMinute && minute <= endHour * 60;

  return (
    <div aria-hidden="true" className="select-none">
      <div className="relative h-14 rounded-xl bg-muted">
        {hours.slice(1, -1).map((hour) => (
          <span
            key={hour}
            className="absolute inset-y-0 w-px bg-border"
            style={{ left: position(hour * 60) }}
          />
        ))}

        {entries.map(({ entry, status }) => (
          <div
            key={entry.id}
            className={cn(
              "absolute inset-y-1.5 flex items-center overflow-hidden rounded-lg border px-2 text-xs font-medium",
              ENTRY_COLORS[entry.color].block,
              status === "past" && "opacity-45",
            )}
            style={{
              left: position(entry.startMinute),
              width: `calc(${((entry.endMinute - entry.startMinute) / totalMinutes) * 100}% - 2px)`,
            }}
          >
            <span className="truncate">{entry.title}</span>
          </div>
        ))}

        {nowIsOnTheLine && (
          <div
            className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 rounded-full bg-signal"
            style={{ left: position(minute) }}
          >
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-signal" />
          </div>
        )}
      </div>

      <div className="relative mt-2 h-4 text-xs text-muted-foreground tabular-nums">
        {hours.map((hour, index) => (
          <span
            key={hour}
            className={cn(
              "absolute -translate-x-1/2",
              index === 0 && "translate-x-0",
              index === hours.length - 1 && "-translate-x-full",
            )}
            style={{ left: position(hour * 60) }}
          >
            {minutesToTime(hour * 60)}
          </span>
        ))}
      </div>
    </div>
  );
}
