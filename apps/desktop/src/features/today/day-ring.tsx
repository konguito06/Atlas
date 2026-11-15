const SIZE = 116;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A ring that fills as today's timetable is worked through. */
export function DayRing({
  fraction,
  hasEntries,
}: {
  /** 0 to 1. */
  fraction: number;
  hasEntries: boolean;
}) {
  const percent = Math.round(fraction * 100);
  const label = hasEntries
    ? `${percent}% of today's timetable done`
    : "Nothing on the timetable today";

  return (
    <div
      role="img"
      aria-label={label}
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        aria-hidden="true"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-foreground/8"
        />
        {hasEntries && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-atlas motion-reduce:transition-none"
          />
        )}
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="text-3xl font-light tabular-nums">
          {hasEntries ? `${percent}%` : "Free"}
        </span>
        <span className="text-xs text-muted-foreground">
          {hasEntries ? "of today done" : "day"}
        </span>
      </div>
    </div>
  );
}
