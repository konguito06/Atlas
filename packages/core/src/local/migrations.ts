import type { SqlDatabase } from "./sql-database";

// The on-device schema, one entry per version. Never edit an entry that has
// shipped: add a new one. The CHECK rules mirror the server's, as a backstop
// behind the validation in the apps.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '' CHECK (length(title) <= 300),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE deadlines (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
    due_date TEXT NOT NULL,
    due_time TEXT,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE timetables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    days TEXT NOT NULL,
    start_hour INTEGER NOT NULL,
    end_hour INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
      start_hour BETWEEN 0 AND 23
      AND end_hour BETWEEN 1 AND 24
      AND end_hour > start_hour
    )
  );

  CREATE TABLE timetable_entries (
    id TEXT PRIMARY KEY,
    timetable_id TEXT NOT NULL REFERENCES timetables (id),
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
    day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 7),
    start_minute INTEGER NOT NULL,
    end_minute INTEGER NOT NULL,
    location TEXT NOT NULL DEFAULT '' CHECK (length(location) <= 100),
    color TEXT NOT NULL
      CHECK (color IN ('slate', 'blue', 'green', 'amber', 'rose', 'violet')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
      start_minute BETWEEN 0 AND 1439
      AND end_minute BETWEEN 1 AND 1440
      AND end_minute > start_minute
    )
  );

  CREATE INDEX timetable_entries_timetable_id
    ON timetable_entries (timetable_id);
  `,
  // Deadlines grow into tasks. Every existing deadline becomes a task.
  `
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    color TEXT NOT NULL
      CHECK (color IN ('slate', 'blue', 'green', 'amber', 'rose', 'violet')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
    notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 5000),
    status TEXT NOT NULL DEFAULT 'todo'
      CHECK (status IN ('todo', 'doing', 'done')),
    priority TEXT NOT NULL DEFAULT 'none'
      CHECK (priority IN ('none', 'low', 'medium', 'high')),
    due_date TEXT,
    due_time TEXT,
    project_id TEXT REFERENCES projects (id),
    parent_id TEXT REFERENCES tasks (id),
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (due_time IS NULL OR due_date IS NOT NULL)
  );

  CREATE INDEX tasks_parent_id ON tasks (parent_id);

  INSERT INTO tasks
    (id, title, status, due_date, due_time, completed_at, created_at, updated_at)
  SELECT
    id,
    title,
    CASE completed WHEN 1 THEN 'done' ELSE 'todo' END,
    due_date,
    due_time,
    CASE completed WHEN 1 THEN updated_at END,
    created_at,
    updated_at
  FROM deadlines;

  DROP TABLE deadlines;
  `,
  // Exams, and the option of pointing a task at the exam it prepares for.
  `
  CREATE TABLE exams (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL CHECK (length(trim(subject)) BETWEEN 1 AND 100),
    date TEXT NOT NULL,
    time TEXT,
    location TEXT NOT NULL DEFAULT '' CHECK (length(location) <= 100),
    notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 5000),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  ALTER TABLE tasks ADD COLUMN exam_id TEXT REFERENCES exams (id);
  `,
  // Events: things that happen on one date, unlike the weekly timetable.
  `
  CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
    date TEXT NOT NULL,
    start_minute INTEGER,
    end_minute INTEGER,
    location TEXT NOT NULL DEFAULT '' CHECK (length(location) <= 100),
    notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 5000),
    color TEXT NOT NULL
      CHECK (color IN ('slate', 'blue', 'green', 'amber', 'rose', 'violet')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    -- Both times or neither. Written this way because a CHECK that
    -- evaluates to NULL passes, which a half-filled pair would otherwise do.
    CHECK ((start_minute IS NULL) = (end_minute IS NULL)),
    CHECK (
      start_minute IS NULL
      OR (
        start_minute BETWEEN 0 AND 1439
        AND end_minute BETWEEN 1 AND 1440
        AND end_minute > start_minute
      )
    )
  );

  CREATE INDEX events_date ON events (date);
  `,
];

/** Brings the on-device database up to the current schema. Safe to rerun. */
export async function migrate(db: SqlDatabase): Promise<void> {
  const [row] = await db.select<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    // One call, so the whole step runs on one connection and either all of
    // it applies or none of it does.
    await db.execute(
      `BEGIN; ${MIGRATIONS[version]} PRAGMA user_version = ${version + 1}; COMMIT;`,
    );
  }
}
