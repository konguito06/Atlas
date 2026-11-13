import { z } from "zod";
import { DISPLAY_LOCALE, type Validated } from "./deadlines";
import type { AtlasClient } from "./supabase";

export const TIMETABLE_NAME_MAX_LENGTH = 100;
export const ENTRY_TITLE_MAX_LENGTH = 100;
export const ENTRY_LOCATION_MAX_LENGTH = 100;

/** ISO weekday numbers: 1 is Monday, 7 is Sunday. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const TIMETABLE_COLORS = [
  "blue",
  "green",
  "amber",
  "rose",
  "violet",
  "slate",
] as const;
export type TimetableColor = (typeof TIMETABLE_COLORS)[number];

/** What a person chooses when creating or customising a timetable. */
export interface TimetableSettings {
  name: string;
  /** The weekdays shown as columns. */
  days: Weekday[];
  /** The hours the grid covers, for example 8 to 20. */
  startHour: number;
  endHour: number;
}

export interface Timetable extends TimetableSettings {
  id: string;
}

/** What a person fills in for one block on the timetable. */
export interface TimetableEntryDraft {
  title: string;
  day: Weekday;
  /** Minutes after midnight, so 9:30 is 570. */
  startMinute: number;
  endMinute: number;
  location: string;
  color: TimetableColor;
}

export interface TimetableEntry extends TimetableEntryDraft {
  id: string;
  timetableId: string;
}

export const DEFAULT_TIMETABLE_SETTINGS: TimetableSettings = {
  name: "",
  days: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 20,
};

const weekdaySchema = z.union(WEEKDAYS.map((day) => z.literal(day)));

const settingsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give the timetable a name.")
      .max(
        TIMETABLE_NAME_MAX_LENGTH,
        `Keep the name under ${TIMETABLE_NAME_MAX_LENGTH} characters.`,
      ),
    days: z
      .array(weekdaySchema)
      .min(1, "Show at least one day.")
      .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
  })
  .refine((settings) => settings.endHour > settings.startHour, {
    message: "The last hour must be after the first hour.",
  });

const entrySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give the entry a title.")
      .max(
        ENTRY_TITLE_MAX_LENGTH,
        `Keep the title under ${ENTRY_TITLE_MAX_LENGTH} characters.`,
      ),
    day: weekdaySchema,
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    location: z
      .string()
      .trim()
      .max(
        ENTRY_LOCATION_MAX_LENGTH,
        `Keep the location under ${ENTRY_LOCATION_MAX_LENGTH} characters.`,
      ),
    color: z.enum(TIMETABLE_COLORS),
  })
  .refine((entry) => entry.endMinute > entry.startMinute, {
    message: "The end time must be after the start time.",
  });

function firstMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

export function validateTimetable(
  settings: TimetableSettings,
): Validated<TimetableSettings> {
  const parsed = settingsSchema.safeParse(settings);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        message: firstMessage(parsed.error, "Check the timetable."),
      };
}

export function validateTimetableEntry(
  draft: TimetableEntryDraft,
): Validated<TimetableEntryDraft> {
  const parsed = entrySchema.safeParse(draft);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, message: firstMessage(parsed.error, "Check the entry.") };
}

/** 570 becomes "09:30". */
export function minutesToTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const rest = String(minutes % 60).padStart(2, "0");
  return `${hours}:${rest}`;
}

/** "09:30" becomes 570. Returns null for anything that is not a clock time. */
export function timeToMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

// 1 January 2024 was a Monday, so day N of that month is ISO weekday N.
export function weekdayName(
  day: Weekday,
  format: "long" | "short" = "long",
  locale: string = DISPLAY_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, { weekday: format }).format(
    new Date(2024, 0, day),
  );
}

export interface PlacedEntry {
  entry: TimetableEntry;
  /** Which side-by-side slot the entry takes, from 0. */
  lane: number;
  /** How many slots its group of overlapping entries needs. */
  lanes: number;
}

/**
 * Arranges one day's entries so that ones overlapping in time sit side by
 * side instead of on top of each other.
 */
export function layoutDay(entries: TimetableEntry[]): PlacedEntry[] {
  const sorted = [...entries].sort(
    (a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute,
  );
  const placed: PlacedEntry[] = [];
  let group: PlacedEntry[] = [];
  let laneEnds: number[] = [];
  let groupEnd = 0;

  function closeGroup() {
    for (const item of group) item.lanes = laneEnds.length;
    placed.push(...group);
    group = [];
    laneEnds = [];
  }

  for (const entry of sorted) {
    // A gap after everything so far means the overlap chain is broken.
    if (group.length > 0 && entry.startMinute >= groupEnd) {
      closeGroup();
    }
    let lane = laneEnds.findIndex((end) => end <= entry.startMinute);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = entry.endMinute;
    groupEnd = Math.max(groupEnd, entry.endMinute);
    group.push({ entry, lane, lanes: 1 });
  }
  closeGroup();

  return placed;
}

/**
 * Splits entries into the ones the timetable's days and hours can show and
 * a count of the ones they hide completely.
 */
export function visibleEntries(
  timetable: TimetableSettings,
  entries: TimetableEntry[],
): { visible: TimetableEntry[]; hiddenCount: number } {
  const firstMinute = timetable.startHour * 60;
  const lastMinute = timetable.endHour * 60;
  const visible = entries.filter(
    (entry) =>
      timetable.days.includes(entry.day) &&
      entry.endMinute > firstMinute &&
      entry.startMinute < lastMinute,
  );
  return { visible, hiddenCount: entries.length - visible.length };
}

export interface TimetablesData {
  /** Oldest first. */
  listTimetables(workspaceId: string): Promise<Timetable[]>;
  createTimetable(
    input: { id: string; workspaceId: string } & TimetableSettings,
  ): Promise<Timetable>;
  updateTimetable(id: string, settings: TimetableSettings): Promise<Timetable>;
  deleteTimetable(id: string): Promise<void>;
  listTimetableEntries(timetableId: string): Promise<TimetableEntry[]>;
  createTimetableEntry(
    input: { id: string; timetableId: string } & TimetableEntryDraft,
  ): Promise<TimetableEntry>;
  updateTimetableEntry(
    id: string,
    draft: TimetableEntryDraft,
  ): Promise<TimetableEntry>;
  deleteTimetableEntry(id: string): Promise<void>;
}

const TIMETABLE_COLUMNS = "id, name, days, start_hour, end_hour";
const ENTRY_COLUMNS =
  "id, timetable_id, title, day, start_minute, end_minute, location, color";

interface TimetableRow {
  id: string;
  name: string;
  days: number[];
  start_hour: number;
  end_hour: number;
}

interface EntryRow {
  id: string;
  timetable_id: string;
  title: string;
  day: number;
  start_minute: number;
  end_minute: number;
  location: string;
  color: string;
}

// The database constrains days and colours to these sets, so the casts hold.
function toTimetable(row: TimetableRow): Timetable {
  return {
    id: row.id,
    name: row.name,
    days: row.days as Weekday[],
    startHour: row.start_hour,
    endHour: row.end_hour,
  };
}

function toEntry(row: EntryRow): TimetableEntry {
  return {
    id: row.id,
    timetableId: row.timetable_id,
    title: row.title,
    day: row.day as Weekday,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    location: row.location,
    color: row.color as TimetableColor,
  };
}

function settingsColumns(settings: TimetableSettings) {
  return {
    name: settings.name,
    days: settings.days,
    start_hour: settings.startHour,
    end_hour: settings.endHour,
  };
}

function entryColumns(draft: TimetableEntryDraft) {
  return {
    title: draft.title,
    day: draft.day,
    start_minute: draft.startMinute,
    end_minute: draft.endMinute,
    location: draft.location,
    color: draft.color,
  };
}

export function createTimetablesData(client: AtlasClient): TimetablesData {
  return {
    async listTimetables(workspaceId) {
      const { data, error } = await client
        .from("timetables")
        .select(TIMETABLE_COLUMNS)
        .eq("workspace_id", workspaceId)
        .order("created_at")
        .order("id");
      if (error) throw new Error("Could not load your timetables.");
      return data.map(toTimetable);
    },

    async createTimetable({ id, workspaceId, ...settings }) {
      const { data, error } = await client
        .from("timetables")
        .insert({ id, workspace_id: workspaceId, ...settingsColumns(settings) })
        .select(TIMETABLE_COLUMNS)
        .single();
      if (error) throw new Error("Could not create the timetable.");
      return toTimetable(data);
    },

    async updateTimetable(id, settings) {
      const { data, error } = await client
        .from("timetables")
        .update(settingsColumns(settings))
        .eq("id", id)
        .select(TIMETABLE_COLUMNS)
        .single();
      if (error) throw new Error("Could not save the timetable.");
      return toTimetable(data);
    },

    async deleteTimetable(id) {
      const { error } = await client.from("timetables").delete().eq("id", id);
      if (error) throw new Error("Could not delete the timetable.");
    },

    async listTimetableEntries(timetableId) {
      const { data, error } = await client
        .from("timetable_entries")
        .select(ENTRY_COLUMNS)
        .eq("timetable_id", timetableId);
      if (error) throw new Error("Could not load the timetable.");
      return data.map(toEntry);
    },

    async createTimetableEntry({ id, timetableId, ...draft }) {
      const { data, error } = await client
        .from("timetable_entries")
        .insert({ id, timetable_id: timetableId, ...entryColumns(draft) })
        .select(ENTRY_COLUMNS)
        .single();
      if (error) throw new Error("Could not add the entry.");
      return toEntry(data);
    },

    async updateTimetableEntry(id, draft) {
      const { data, error } = await client
        .from("timetable_entries")
        .update(entryColumns(draft))
        .eq("id", id)
        .select(ENTRY_COLUMNS)
        .single();
      if (error) throw new Error("Could not save the entry.");
      return toEntry(data);
    },

    async deleteTimetableEntry(id) {
      const { error } = await client
        .from("timetable_entries")
        .delete()
        .eq("id", id);
      if (error) throw new Error("Could not delete the entry.");
    },
  };
}
