import { z } from "zod";
import type { AtlasClient } from "./supabase";

export const DEADLINE_TITLE_MAX_LENGTH = 200;

/**
 * The interface is in English, so dates are written in English too instead
 * of following the device, which would mix languages on screen.
 */
export const DISPLAY_LOCALE = "en-GB";

export interface Deadline {
  id: string;
  title: string;
  /** Calendar date, YYYY-MM-DD, with no time zone. */
  dueDate: string;
  /** Clock time, HH:MM, or null when only the day matters. */
  dueTime: string | null;
  completed: boolean;
}

/** What a person fills in to create or edit a deadline. */
export interface DeadlineDraft {
  title: string;
  dueDate: string;
  dueTime: string | null;
}

const draftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the deadline a title.")
    .max(
      DEADLINE_TITLE_MAX_LENGTH,
      `Keep the title under ${DEADLINE_TITLE_MAX_LENGTH} characters.`,
    ),
  dueDate: z.iso.date("Pick a date."),
  dueTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter the time as hours and minutes.")
    .nullable(),
});

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function validateDeadline(
  draft: DeadlineDraft,
): Validated<DeadlineDraft> {
  const parsed = draftSchema.safeParse(draft);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Check the deadline.",
      };
}

/** Today's date where the person is, as YYYY-MM-DD. */
export function toLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** "Today", "Tomorrow", "Yesterday", or the date written out. */
export function describeDueDate(
  dueDate: string,
  today: string,
  locale: string = DISPLAY_LOCALE,
): string {
  const due = parseLocalDate(dueDate);
  const reference = parseLocalDate(today);
  // Rounding absorbs the hour gained or lost on a daylight-saving change.
  const days = Math.round((due.getTime() - reference.getTime()) / DAY_IN_MS);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: due.getFullYear() === reference.getFullYear() ? undefined : "numeric",
  }).format(due);
}

export interface DeadlineGroups {
  overdue: Deadline[];
  today: Deadline[];
  upcoming: Deadline[];
  done: Deadline[];
}

// Soonest first. On the same day, timed deadlines come before all-day ones.
function byDueDate(a: Deadline, b: Deadline): number {
  return (
    a.dueDate.localeCompare(b.dueDate) ||
    (a.dueTime ?? "24:00").localeCompare(b.dueTime ?? "24:00") ||
    a.title.localeCompare(b.title)
  );
}

/**
 * Sorts deadlines into the sections a list shows. A deadline counts as
 * overdue from the day after its date, whatever its time.
 */
export function groupDeadlines(
  deadlines: Deadline[],
  today: string,
): DeadlineGroups {
  const open = deadlines.filter((deadline) => !deadline.completed);
  return {
    overdue: open
      .filter((deadline) => deadline.dueDate < today)
      .sort(byDueDate),
    today: open
      .filter((deadline) => deadline.dueDate === today)
      .sort(byDueDate),
    upcoming: open
      .filter((deadline) => deadline.dueDate > today)
      .sort(byDueDate),
    done: deadlines
      .filter((deadline) => deadline.completed)
      .sort((a, b) => byDueDate(b, a)),
  };
}

export interface DeadlinesData {
  listDeadlines(workspaceId: string): Promise<Deadline[]>;
  createDeadline(
    input: { id: string; workspaceId: string } & DeadlineDraft,
  ): Promise<Deadline>;
  updateDeadline(
    id: string,
    change: Partial<DeadlineDraft & { completed: boolean }>,
  ): Promise<Deadline>;
  deleteDeadline(id: string): Promise<void>;
}

const COLUMNS = "id, title, due_date, due_time, completed";

interface DeadlineRow {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  completed: boolean;
}

function toDeadline(row: DeadlineRow): Deadline {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    // The database answers HH:MM:SS; the apps work in HH:MM.
    dueTime: row.due_time ? row.due_time.slice(0, 5) : null,
    completed: row.completed,
  };
}

export function createDeadlinesData(client: AtlasClient): DeadlinesData {
  return {
    async listDeadlines(workspaceId) {
      const { data, error } = await client
        .from("deadlines")
        .select(COLUMNS)
        .eq("workspace_id", workspaceId);
      if (error) throw new Error("Could not load your deadlines.");
      return data.map(toDeadline);
    },

    async createDeadline({ id, workspaceId, title, dueDate, dueTime }) {
      const { data, error } = await client
        .from("deadlines")
        .insert({
          id,
          workspace_id: workspaceId,
          title,
          due_date: dueDate,
          due_time: dueTime,
        })
        .select(COLUMNS)
        .single();
      if (error) throw new Error("Could not add the deadline.");
      return toDeadline(data);
    },

    async updateDeadline(id, change) {
      const { data, error } = await client
        .from("deadlines")
        .update({
          title: change.title,
          due_date: change.dueDate,
          due_time: change.dueTime,
          completed: change.completed,
        })
        .eq("id", id)
        .select(COLUMNS)
        .single();
      if (error) throw new Error("Could not save the deadline.");
      return toDeadline(data);
    },

    async deleteDeadline(id) {
      const { error } = await client.from("deadlines").delete().eq("id", id);
      if (error) throw new Error("Could not delete the deadline.");
    },
  };
}
