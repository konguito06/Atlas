import { describeMinutes, type WeekDay, weekdayName } from "@atlas/core";
import { cn } from "@/lib/utils";

/** The week as seven columns: how busy each day is and what is due on it. */
export function WeekStrip({ days }: { days: WeekDay[] }) {
  const busiest = Math.max(...days.map((day) => day.scheduledMinutes), 1);

  return (
    <>
      <ol aria-label="This week" className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dayOfMonth = Number(day.date.slice(8));
          const entries =
            day.entryCount === 0
              ? "nothing scheduled"
              : `${day.entryCount} ${day.entryCount === 1 ? "entry" : "entries"}, ${describeMinutes(day.scheduledMinutes)}`;
          const due =
            day.dueCount === 0 ? "nothing due" : `${day.dueCount} due`;
          return (
            <li
              key={day.date}
              aria-label={`${weekdayName(day.weekday)} ${dayOfMonth}: ${entries}, ${due}`}
              aria-current={day.isToday ? "date" : undefined}
              className={cn(
                "flex flex-col items-center rounded-lg px-1 py-2",
                day.isToday && "bg-accent",
              )}
            >
              <span
                className={cn(
                  "text-xs text-muted-foreground",
                  day.isToday && "font-medium text-foreground",
                )}
              >
                {weekdayName(day.weekday, "short")}
              </span>
              <span className="text-sm tabular-nums">{dayOfMonth}</span>
              <span className="mt-2 flex h-14 w-full items-end justify-center">
                <span
                  className={cn(
                    "w-3 rounded-sm bg-primary/35",
                    day.isToday && "bg-primary",
                    day.entryCount === 0 && "bg-border",
                  )}
                  style={{
                    height:
                      day.entryCount === 0
                        ? 2
                        : `${Math.max((day.scheduledMinutes / busiest) * 100, 8)}%`,
                  }}
                />
              </span>
              <span className="mt-2 flex h-5 items-center">
                {day.dueCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1 text-xs font-medium tabular-nums">
                    {day.dueCount}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Bars show scheduled time. Numbers show deadlines due.
      </p>
    </>
  );
}
