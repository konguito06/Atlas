import { z } from "zod";
import type { Validated } from "./dates";
import { TIMETABLE_COLORS, type TimetableColor } from "./timetables";

export const EVENT_TITLE_MAX_LENGTH = 100;
export const EVENT_LOCATION_MAX_LENGTH = 100;
export const EVENT_NOTES_MAX_LENGTH = 5000;

/**
 * What a person fills in for something that happens on one date: a
 * meeting, a trip, a study session. A timetable entry repeats every week;
 * an event does not.
 */
export interface CalendarEventDraft {
  title: string;
  /** Calendar date, YYYY-MM-DD, with no time zone. */
  date: string;
  /** Minutes after midnight. Both null means the event takes the whole day. */
  startMinute: number | null;
  endMinute: number | null;
  location: string;
  notes: string;
  /** Events share the timetable's palette, so colours mean one thing. */
  color: TimetableColor;
}

export interface CalendarEvent extends CalendarEventDraft {
  id: string;
  createdAt: string;
}

const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give the event a title.")
      .max(
        EVENT_TITLE_MAX_LENGTH,
        `Keep the title under ${EVENT_TITLE_MAX_LENGTH} characters.`,
      ),
    date: z.iso.date("Pick the date of the event."),
    startMinute: z.number().int().min(0).max(1439).nullable(),
    endMinute: z.number().int().min(1).max(1440).nullable(),
    location: z
      .string()
      .trim()
      .max(
        EVENT_LOCATION_MAX_LENGTH,
        `Keep the location under ${EVENT_LOCATION_MAX_LENGTH} characters.`,
      ),
    notes: z
      .string()
      .max(
        EVENT_NOTES_MAX_LENGTH,
        `Keep the notes under ${EVENT_NOTES_MAX_LENGTH} characters.`,
      ),
    color: z.enum(TIMETABLE_COLORS),
  })
  .refine(
    (event) => (event.startMinute === null) === (event.endMinute === null),
    { message: "Give both a start and an end time, or neither." },
  )
  .refine(
    (event) =>
      event.startMinute === null ||
      event.endMinute === null ||
      event.endMinute > event.startMinute,
    { message: "The end must be after the start." },
  );

export function validateEvent(
  draft: CalendarEventDraft,
): Validated<CalendarEventDraft> {
  const parsed = eventSchema.safeParse(draft);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Check the event.",
      };
}

/** Events today or later, soonest first; whole-day ones lead their day. */
export function upcomingEvents(
  events: CalendarEvent[],
  today: string,
): CalendarEvent[] {
  return events
    .filter((event) => event.date >= today)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.startMinute ?? -1) - (b.startMinute ?? -1) ||
        a.title.localeCompare(b.title),
    );
}

export interface EventsData {
  listEvents(workspaceId: string): Promise<CalendarEvent[]>;
  createEvent(
    input: { id: string; workspaceId: string } & CalendarEventDraft,
  ): Promise<CalendarEvent>;
  updateEvent(id: string, draft: CalendarEventDraft): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<void>;
}
