import {
  type CalendarEvent,
  type DayItem,
  minutesToTime,
  type TimedItem,
} from "@atlas/core";
import { ENTRY_COLORS } from "@/features/timetable/entry-colors";
import { cn } from "@/lib/utils";

/** "09:00 to 10:30", as a screen reader should say it. */
export function spokenTimes(item: TimedItem): string {
  return `${minutesToTime(item.startMinute)} to ${minutesToTime(item.endMinute)}`;
}

/**
 * A small line for something that belongs to a whole day: an event (which
 * opens), an exam or a task that is due (which are shown, not edited here).
 */
export function DayChip({
  item,
  onOpenEvent,
}: {
  item: DayItem;
  onOpenEvent: (event: CalendarEvent) => void;
}) {
  if (item.kind === "event") {
    return (
      <button
        type="button"
        aria-label={`${item.title}, all day`}
        onClick={() => onOpenEvent(item.event)}
        className={cn(
          "block w-full truncate rounded border px-1.5 py-0.5 text-left text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          ENTRY_COLORS[item.event.color].block,
        )}
      >
        {item.title}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          item.kind === "exam" ? "bg-signal" : "bg-primary",
        )}
      />
      <span className="truncate">
        <span className="text-muted-foreground">
          {item.kind === "exam" ? "Exam: " : "Due: "}
        </span>
        <span className="font-medium">{item.title}</span>
        {item.time && (
          <span className="text-muted-foreground tabular-nums">
            , {item.time}
          </span>
        )}
      </span>
    </span>
  );
}
