import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

// Tables and columns only. Row Level Security policies, grants and functions
// are hand-written SQL in supabase/migrations so they can be audited in one place.

export const workspaceRole = pgEnum("workspace_role", ["owner", "member"]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    createdBy: uuid()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    check(
      "workspaces_name_length",
      sql`char_length(btrim(${table.name})) between 1 and 100`,
    ),
  ],
).enableRLS();

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: workspaceRole().notNull().default("member"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_id_idx").on(table.userId),
  ],
).enableRLS();

export const documents = pgTable(
  "documents",
  {
    // Clients may supply the id so a document can be created offline.
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text().notNull().default(""),
    // The document format from @atlas/core. The default is its empty document.
    content: jsonb()
      .notNull()
      .default(
        sql`'{"version":1,"type":"doc","content":[{"type":"paragraph"}]}'::jsonb`,
      ),
    createdBy: uuid()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("documents_workspace_id_idx").on(table.workspaceId),
    check("documents_title_length", sql`char_length(${table.title}) <= 300`),
    // Full validation happens in the apps; this only keeps out content that
    // is not a versioned object, such as a string of HTML.
    check(
      "documents_content_shape",
      sql`jsonb_typeof(${table.content}) = 'object' and jsonb_typeof(${table.content} -> 'version') = 'number'`,
    ),
  ],
).enableRLS();

export const deadlines = pgTable(
  "deadlines",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text().notNull(),
    // A calendar date and optional clock time with no time zone: "20 Nov,
    // 23:59" means that date and time wherever it is read.
    dueDate: date().notNull(),
    dueTime: time(),
    completed: boolean().notNull().default(false),
    createdBy: uuid()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("deadlines_workspace_id_due_date_idx").on(
      table.workspaceId,
      table.dueDate,
    ),
    check(
      "deadlines_title_length",
      sql`char_length(btrim(${table.title})) between 1 and 200`,
    ),
  ],
).enableRLS();

export const timetables = pgTable(
  "timetables",
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text().notNull(),
    // Weekdays shown as columns, ISO numbering: 1 is Monday, 7 is Sunday.
    days: smallint().array().notNull().default(sql`'{1,2,3,4,5}'`),
    // The hours the grid covers, for example 8 to 20.
    startHour: smallint().notNull().default(8),
    endHour: smallint().notNull().default(20),
    createdBy: uuid()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("timetables_workspace_id_idx").on(table.workspaceId),
    check(
      "timetables_name_length",
      sql`char_length(btrim(${table.name})) between 1 and 100`,
    ),
    check(
      "timetables_days_valid",
      sql`cardinality(${table.days}) between 1 and 7 and ${table.days} <@ '{1,2,3,4,5,6,7}'::smallint[]`,
    ),
    check(
      "timetables_hours_valid",
      sql`${table.startHour} between 0 and 23 and ${table.endHour} between 1 and 24 and ${table.endHour} > ${table.startHour}`,
    ),
  ],
).enableRLS();

export const timetableEntries = pgTable(
  "timetable_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    timetableId: uuid()
      .notNull()
      .references(() => timetables.id, { onDelete: "cascade" }),
    title: text().notNull(),
    day: smallint().notNull(),
    // Minutes after midnight, so 9:30 is 570.
    startMinute: smallint().notNull(),
    endMinute: smallint().notNull(),
    location: text().notNull().default(""),
    color: text().notNull().default("blue"),
    ...timestamps,
  },
  (table) => [
    index("timetable_entries_timetable_id_idx").on(table.timetableId),
    check(
      "timetable_entries_title_length",
      sql`char_length(btrim(${table.title})) between 1 and 100`,
    ),
    check("timetable_entries_day_valid", sql`${table.day} between 1 and 7`),
    check(
      "timetable_entries_time_valid",
      sql`${table.startMinute} between 0 and 1439 and ${table.endMinute} between 1 and 1440 and ${table.endMinute} > ${table.startMinute}`,
    ),
    check(
      "timetable_entries_location_length",
      sql`char_length(${table.location}) <= 100`,
    ),
    check(
      "timetable_entries_color_valid",
      sql`${table.color} in ('slate', 'blue', 'green', 'amber', 'rose', 'violet')`,
    ),
  ],
).enableRLS();
