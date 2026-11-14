import type { AtlasData, DocumentSummary } from "../data";
import type { Deadline } from "../deadlines";
import { createEmptyDocument } from "../document";
import type {
  Timetable,
  TimetableColor,
  TimetableEntry,
  Weekday,
} from "../timetables";
import type { SqlDatabase, SqlValue } from "./sql-database";

/** The one workspace that exists while data lives on the device. */
export const LOCAL_WORKSPACE = { id: "local", name: "Personal" } as const;

interface DocumentRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface DeadlineRow {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  completed: number;
}

interface TimetableRow {
  id: string;
  name: string;
  days: string;
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

const DOCUMENT_COLUMNS = "id, title, created_at, updated_at";
const DEADLINE_COLUMNS = "id, title, due_date, due_time, completed";
const TIMETABLE_COLUMNS = "id, name, days, start_hour, end_hour";
const ENTRY_COLUMNS =
  "id, timetable_id, title, day, start_minute, end_minute, location, color";

function toDocument(row: DocumentRow): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDeadline(row: DeadlineRow): Deadline {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    dueTime: row.due_time,
    completed: row.completed === 1,
  };
}

// The table's CHECK rules constrain days and colours, so the casts hold.
function toTimetable(row: TimetableRow): Timetable {
  return {
    id: row.id,
    name: row.name,
    days: JSON.parse(row.days) as Weekday[],
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

/**
 * The data layer backed by a SQLite database on the device. It behaves like
 * the server-backed one, so screens cannot tell them apart.
 */
export function createLocalAtlasData(db: SqlDatabase): AtlasData {
  const now = () => new Date().toISOString();

  // Runs a write, turning any database failure into a message for people.
  async function write(message: string, sql: string, params: SqlValue[]) {
    try {
      await db.execute(sql, params);
    } catch {
      throw new Error(message);
    }
  }

  // Reads back the row a write touched; a missing row means the write failed.
  async function one<Row>(
    message: string,
    table: string,
    columns: string,
    id: string,
  ): Promise<Row> {
    const [row] = await db.select<Row>(
      `SELECT ${columns} FROM ${table} WHERE id = ?`,
      [id],
    );
    if (!row) throw new Error(message);
    return row;
  }

  return {
    async listWorkspaces() {
      return [{ ...LOCAL_WORKSPACE }];
    },

    async listDocuments() {
      // rowid follows insertion order, so this is newest first even when two
      // documents share a timestamp.
      const rows = await db.select<DocumentRow>(
        `SELECT ${DOCUMENT_COLUMNS} FROM documents ORDER BY rowid DESC`,
      );
      return rows.map(toDocument);
    },

    async createDocument({ id }) {
      const message = "Could not create the document.";
      const timestamp = now();
      await write(
        message,
        "INSERT INTO documents (id, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [id, JSON.stringify(createEmptyDocument()), timestamp, timestamp],
      );
      return toDocument(
        await one<DocumentRow>(message, "documents", DOCUMENT_COLUMNS, id),
      );
    },

    async renameDocument(id, title) {
      const message = "Could not rename the document.";
      await write(
        message,
        "UPDATE documents SET title = ?, updated_at = ? WHERE id = ?",
        [title, now(), id],
      );
      return toDocument(
        await one<DocumentRow>(message, "documents", DOCUMENT_COLUMNS, id),
      );
    },

    async deleteDocument(id) {
      await write(
        "Could not delete the document.",
        "DELETE FROM documents WHERE id = ?",
        [id],
      );
    },

    async listDeadlines() {
      const rows = await db.select<DeadlineRow>(
        `SELECT ${DEADLINE_COLUMNS} FROM deadlines`,
      );
      return rows.map(toDeadline);
    },

    async createDeadline({ id, title, dueDate, dueTime }) {
      const message = "Could not add the deadline.";
      const timestamp = now();
      await write(
        message,
        "INSERT INTO deadlines (id, title, due_date, due_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [id, title, dueDate, dueTime, timestamp, timestamp],
      );
      return toDeadline(
        await one<DeadlineRow>(message, "deadlines", DEADLINE_COLUMNS, id),
      );
    },

    async updateDeadline(id, change) {
      const message = "Could not save the deadline.";
      // Only the fields that were passed change; a null time clears it.
      const assignments: string[] = ["updated_at = ?"];
      const params: SqlValue[] = [now()];
      if (change.title !== undefined) {
        assignments.push("title = ?");
        params.push(change.title);
      }
      if (change.dueDate !== undefined) {
        assignments.push("due_date = ?");
        params.push(change.dueDate);
      }
      if (change.dueTime !== undefined) {
        assignments.push("due_time = ?");
        params.push(change.dueTime);
      }
      if (change.completed !== undefined) {
        assignments.push("completed = ?");
        params.push(change.completed ? 1 : 0);
      }
      await write(
        message,
        `UPDATE deadlines SET ${assignments.join(", ")} WHERE id = ?`,
        [...params, id],
      );
      return toDeadline(
        await one<DeadlineRow>(message, "deadlines", DEADLINE_COLUMNS, id),
      );
    },

    async deleteDeadline(id) {
      await write(
        "Could not delete the deadline.",
        "DELETE FROM deadlines WHERE id = ?",
        [id],
      );
    },

    async listTimetables() {
      const rows = await db.select<TimetableRow>(
        `SELECT ${TIMETABLE_COLUMNS} FROM timetables ORDER BY rowid`,
      );
      return rows.map(toTimetable);
    },

    async createTimetable({ id, name, days, startHour, endHour }) {
      const message = "Could not create the timetable.";
      const timestamp = now();
      await write(
        message,
        "INSERT INTO timetables (id, name, days, start_hour, end_hour, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          name,
          JSON.stringify(days),
          startHour,
          endHour,
          timestamp,
          timestamp,
        ],
      );
      return toTimetable(
        await one<TimetableRow>(message, "timetables", TIMETABLE_COLUMNS, id),
      );
    },

    async updateTimetable(id, { name, days, startHour, endHour }) {
      const message = "Could not save the timetable.";
      await write(
        message,
        "UPDATE timetables SET name = ?, days = ?, start_hour = ?, end_hour = ?, updated_at = ? WHERE id = ?",
        [name, JSON.stringify(days), startHour, endHour, now(), id],
      );
      return toTimetable(
        await one<TimetableRow>(message, "timetables", TIMETABLE_COLUMNS, id),
      );
    },

    async deleteTimetable(id) {
      const message = "Could not delete the timetable.";
      // Entries first: if the second step fails, nothing is left orphaned.
      await write(
        message,
        "DELETE FROM timetable_entries WHERE timetable_id = ?",
        [id],
      );
      await write(message, "DELETE FROM timetables WHERE id = ?", [id]);
    },

    async listTimetableEntries(timetableId) {
      const rows = await db.select<EntryRow>(
        `SELECT ${ENTRY_COLUMNS} FROM timetable_entries WHERE timetable_id = ?`,
        [timetableId],
      );
      return rows.map(toEntry);
    },

    async createTimetableEntry({ id, timetableId, ...draft }) {
      const message = "Could not add the entry.";
      const timestamp = now();
      // The driver's connections do not all enforce foreign keys, so check
      // that the timetable exists here.
      await one(message, "timetables", "id", timetableId);
      await write(
        message,
        "INSERT INTO timetable_entries (id, timetable_id, title, day, start_minute, end_minute, location, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          timetableId,
          draft.title,
          draft.day,
          draft.startMinute,
          draft.endMinute,
          draft.location,
          draft.color,
          timestamp,
          timestamp,
        ],
      );
      return toEntry(
        await one<EntryRow>(message, "timetable_entries", ENTRY_COLUMNS, id),
      );
    },

    async updateTimetableEntry(id, draft) {
      const message = "Could not save the entry.";
      await write(
        message,
        "UPDATE timetable_entries SET title = ?, day = ?, start_minute = ?, end_minute = ?, location = ?, color = ?, updated_at = ? WHERE id = ?",
        [
          draft.title,
          draft.day,
          draft.startMinute,
          draft.endMinute,
          draft.location,
          draft.color,
          now(),
          id,
        ],
      );
      return toEntry(
        await one<EntryRow>(message, "timetable_entries", ENTRY_COLUMNS, id),
      );
    },

    async deleteTimetableEntry(id) {
      await write(
        "Could not delete the entry.",
        "DELETE FROM timetable_entries WHERE id = ?",
        [id],
      );
    },
  };
}
