import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
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
