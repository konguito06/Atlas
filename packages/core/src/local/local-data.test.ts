import { expect, test } from "vitest";
import { describeAtlasData } from "../../test-support/data-contract";
import { createMemoryDatabase } from "../../test-support/node-sqlite";
import { createEmptyDocument, parseDocument } from "../document";
import { createLocalAtlasData } from "./local-data";
import { migrate } from "./migrations";

describeAtlasData("the on-device data layer", async () => {
  const database = createMemoryDatabase();
  await migrate(database);
  return createLocalAtlasData(database);
});

test("migrating twice changes nothing and keeps the data", async () => {
  const database = createMemoryDatabase();
  await migrate(database);
  const data = createLocalAtlasData(database);
  await data.createDocument({ id: "document-1", workspaceId: "local" });

  await migrate(database);

  expect(await data.listDocuments("local")).toHaveLength(1);
});

test("a new document is stored with the empty document as its content", async () => {
  const database = createMemoryDatabase();
  await migrate(database);
  await createLocalAtlasData(database).createDocument({
    id: "document-1",
    workspaceId: "local",
  });

  const [row] = await database.select<{ content: string }>(
    "SELECT content FROM documents",
  );

  expect(parseDocument(JSON.parse(row?.content ?? "null"))).toEqual({
    ok: true,
    document: createEmptyDocument(),
  });
});

test("upgrading from the first version turns each deadline into a task", async () => {
  const database = createMemoryDatabase();
  // The first version of the schema, as an early install would have it.
  await database.execute(`
    CREATE TABLE deadlines (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, due_date TEXT NOT NULL,
      due_time TEXT, completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE documents (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE timetables (id TEXT PRIMARY KEY, name TEXT NOT NULL, days TEXT NOT NULL,
      start_hour INTEGER NOT NULL, end_hour INTEGER NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE timetable_entries (id TEXT PRIMARY KEY, timetable_id TEXT NOT NULL,
      title TEXT NOT NULL, day INTEGER NOT NULL, start_minute INTEGER NOT NULL,
      end_minute INTEGER NOT NULL, location TEXT NOT NULL DEFAULT '', color TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT INTO deadlines VALUES
      ('open', 'Essay', '2026-12-01', '23:59', 0, '2026-11-01T10:00:00.000Z', '2026-11-01T10:00:00.000Z'),
      ('finished', 'Quiz', '2026-11-10', NULL, 1, '2026-11-01T10:00:00.000Z', '2026-11-09T18:00:00.000Z');
    PRAGMA user_version = 1;
  `);

  await migrate(database);

  const tasks = await createLocalAtlasData(database).listTasks("local");
  expect(tasks).toEqual([
    expect.objectContaining({
      id: "open",
      title: "Essay",
      status: "todo",
      dueDate: "2026-12-01",
      dueTime: "23:59",
      completedAt: null,
    }),
    expect.objectContaining({
      id: "finished",
      title: "Quiz",
      status: "done",
      dueDate: "2026-11-10",
      completedAt: "2026-11-09T18:00:00.000Z",
    }),
  ]);
});
