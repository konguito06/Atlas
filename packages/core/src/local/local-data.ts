import type { AtlasData, DocumentSummary } from "../data";
import { createEmptyDocument } from "../document";
import type { CalendarEvent } from "../events";
import type { Exam } from "../exams";
import type { DocumentType, Folder } from "../library";
import type {
  Project,
  ProjectColor,
  Task,
  TaskPriority,
  TaskStatus,
} from "../tasks";
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
  type: string;
  favorite: number;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  title: string;
  notes: string;
  status: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  project_id: string | null;
  exam_id: string | null;
  parent_id: string | null;
  completed_at: string | null;
  created_at: string;
}

interface EventRow {
  id: string;
  title: string;
  date: string;
  start_minute: number | null;
  end_minute: number | null;
  location: string;
  notes: string;
  color: string;
  created_at: string;
}

interface ExamRow {
  id: string;
  subject: string;
  date: string;
  time: string | null;
  location: string;
  notes: string;
  created_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  color: string;
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

const DOCUMENT_COLUMNS =
  "id, title, type, favorite, folder_id, created_at, updated_at";
const FOLDER_COLUMNS = "id, name";
const TASK_COLUMNS =
  "id, title, notes, status, priority, due_date, due_time, project_id, exam_id, parent_id, completed_at, created_at";
const EVENT_COLUMNS =
  "id, title, date, start_minute, end_minute, location, notes, color, created_at";
const EXAM_COLUMNS = "id, subject, date, time, location, notes, created_at";
const PROJECT_COLUMNS = "id, name, color";
const TIMETABLE_COLUMNS = "id, name, days, start_hour, end_hour";
const ENTRY_COLUMNS =
  "id, timetable_id, title, day, start_minute, end_minute, location, color";

function toDocument(row: DocumentRow): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    type: row.type as DocumentType,
    favorite: row.favorite === 1,
    folderId: row.folder_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// The tables' CHECK rules constrain these values, so the casts hold.
function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    dueDate: row.due_date,
    dueTime: row.due_time,
    projectId: row.project_id,
    examId: row.exam_id,
    parentId: row.parent_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function toEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    location: row.location,
    notes: row.notes,
    color: row.color as TimetableColor,
    createdAt: row.created_at,
  };
}

function toExam(row: ExamRow): Exam {
  return {
    id: row.id,
    subject: row.subject,
    date: row.date,
    time: row.time,
    location: row.location,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function toProject(row: ProjectRow): Project {
  return { id: row.id, name: row.name, color: row.color as ProjectColor };
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
 * The data layer, backed by a SQLite database on the device.
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

    async createDocument({ id, folderId = null }) {
      const message = "Could not create the document.";
      const timestamp = now();
      // The driver's connections do not all enforce foreign keys, so check
      // that the folder exists here.
      if (folderId) await one(message, "folders", "id", folderId);
      await write(
        message,
        "INSERT INTO documents (id, content, folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [
          id,
          JSON.stringify(createEmptyDocument()),
          folderId,
          timestamp,
          timestamp,
        ],
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

    async organizeDocument(id, change) {
      const message = "Could not update the document.";
      // Filing a document is not editing it, so updated_at is left alone.
      const assignments: string[] = [];
      const params: SqlValue[] = [];
      if (change.favorite !== undefined) {
        assignments.push("favorite = ?");
        params.push(change.favorite ? 1 : 0);
      }
      if (change.folderId !== undefined) {
        if (change.folderId)
          await one(message, "folders", "id", change.folderId);
        assignments.push("folder_id = ?");
        params.push(change.folderId);
      }
      if (assignments.length > 0) {
        await write(
          message,
          `UPDATE documents SET ${assignments.join(", ")} WHERE id = ?`,
          [...params, id],
        );
      }
      return toDocument(
        await one<DocumentRow>(message, "documents", DOCUMENT_COLUMNS, id),
      );
    },

    async listFolders() {
      return db.select<Folder>(
        `SELECT ${FOLDER_COLUMNS} FROM folders ORDER BY rowid`,
      );
    },

    async createFolder({ id, name }) {
      const message = "Could not create the folder.";
      const timestamp = now();
      await write(
        message,
        "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [id, name, timestamp, timestamp],
      );
      return one<Folder>(message, "folders", FOLDER_COLUMNS, id);
    },

    async renameFolder(id, name) {
      const message = "Could not rename the folder.";
      await write(
        message,
        "UPDATE folders SET name = ?, updated_at = ? WHERE id = ?",
        [name, now(), id],
      );
      return one<Folder>(message, "folders", FOLDER_COLUMNS, id);
    },

    async deleteFolder(id) {
      const message = "Could not delete the folder.";
      // Take its documents out first, so none points at a missing folder.
      await write(
        message,
        "UPDATE documents SET folder_id = NULL WHERE folder_id = ?",
        [id],
      );
      await write(message, "DELETE FROM folders WHERE id = ?", [id]);
    },

    async getDocumentContent(id) {
      const message = "Could not open the document.";
      const row = await one<{ content: string }>(
        message,
        "documents",
        "content",
        id,
      );
      try {
        return JSON.parse(row.content);
      } catch {
        throw new Error(message);
      }
    },

    async saveDocumentContent(id, content) {
      const message = "Could not save the document.";
      await write(
        message,
        "UPDATE documents SET content = ?, updated_at = ? WHERE id = ?",
        [JSON.stringify(content), now(), id],
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

    async listTasks() {
      const rows = await db.select<TaskRow>(
        `SELECT ${TASK_COLUMNS} FROM tasks ORDER BY rowid`,
      );
      return rows.map(toTask);
    },

    async createTask({ id, workspaceId: _workspaceId, ...draft }) {
      const message = "Could not add the task.";
      const timestamp = now();
      // The driver's connections do not all enforce foreign keys, so check
      // the references here. A subtask's parent must itself be top-level.
      if (draft.projectId) {
        await one(message, "projects", "id", draft.projectId);
      }
      if (draft.examId) {
        await one(message, "exams", "id", draft.examId);
      }
      if (draft.parentId) {
        const parent = await one<{ parent_id: string | null }>(
          message,
          "tasks",
          "parent_id",
          draft.parentId,
        );
        if (parent.parent_id !== null) throw new Error(message);
      }
      await write(
        message,
        "INSERT INTO tasks (id, title, notes, priority, due_date, due_time, project_id, exam_id, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          draft.title,
          draft.notes,
          draft.priority,
          draft.dueDate,
          draft.dueTime,
          draft.projectId,
          draft.examId,
          draft.parentId,
          timestamp,
          timestamp,
        ],
      );
      return toTask(await one<TaskRow>(message, "tasks", TASK_COLUMNS, id));
    },

    async updateTask(id, change) {
      const message = "Could not save the task.";
      const timestamp = now();
      // Only the fields that were passed change; null clears a field.
      const assignments: string[] = ["updated_at = ?"];
      const params: SqlValue[] = [timestamp];
      const columns = {
        title: "title",
        notes: "notes",
        priority: "priority",
        dueDate: "due_date",
        dueTime: "due_time",
        projectId: "project_id",
        examId: "exam_id",
        status: "status",
      } as const;
      for (const [field, column] of Object.entries(columns)) {
        const value = change[field as keyof typeof columns];
        if (value !== undefined) {
          assignments.push(`${column} = ?`);
          params.push(value);
        }
      }
      if (change.status !== undefined) {
        assignments.push("completed_at = ?");
        params.push(change.status === "done" ? timestamp : null);
      }
      if (change.projectId) {
        await one(message, "projects", "id", change.projectId);
      }
      if (change.examId) {
        await one(message, "exams", "id", change.examId);
      }
      await write(
        message,
        `UPDATE tasks SET ${assignments.join(", ")} WHERE id = ?`,
        [...params, id],
      );
      return toTask(await one<TaskRow>(message, "tasks", TASK_COLUMNS, id));
    },

    async deleteTask(id) {
      const message = "Could not delete the task.";
      // Subtasks first: if the second step fails, nothing is left orphaned.
      await write(message, "DELETE FROM tasks WHERE parent_id = ?", [id]);
      await write(message, "DELETE FROM tasks WHERE id = ?", [id]);
    },

    async listEvents() {
      const rows = await db.select<EventRow>(
        `SELECT ${EVENT_COLUMNS} FROM events ORDER BY rowid`,
      );
      return rows.map(toEvent);
    },

    async createEvent({ id, workspaceId: _workspaceId, ...draft }) {
      const message = "Could not add the event.";
      const timestamp = now();
      await write(
        message,
        "INSERT INTO events (id, title, date, start_minute, end_minute, location, notes, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          draft.title,
          draft.date,
          draft.startMinute,
          draft.endMinute,
          draft.location,
          draft.notes,
          draft.color,
          timestamp,
          timestamp,
        ],
      );
      return toEvent(await one<EventRow>(message, "events", EVENT_COLUMNS, id));
    },

    async updateEvent(id, draft) {
      const message = "Could not save the event.";
      await write(
        message,
        "UPDATE events SET title = ?, date = ?, start_minute = ?, end_minute = ?, location = ?, notes = ?, color = ?, updated_at = ? WHERE id = ?",
        [
          draft.title,
          draft.date,
          draft.startMinute,
          draft.endMinute,
          draft.location,
          draft.notes,
          draft.color,
          now(),
          id,
        ],
      );
      return toEvent(await one<EventRow>(message, "events", EVENT_COLUMNS, id));
    },

    async deleteEvent(id) {
      await write(
        "Could not delete the event.",
        "DELETE FROM events WHERE id = ?",
        [id],
      );
    },

    async listExams() {
      const rows = await db.select<ExamRow>(
        `SELECT ${EXAM_COLUMNS} FROM exams ORDER BY rowid`,
      );
      return rows.map(toExam);
    },

    async createExam({ id, workspaceId: _workspaceId, ...draft }) {
      const message = "Could not add the exam.";
      const timestamp = now();
      await write(
        message,
        "INSERT INTO exams (id, subject, date, time, location, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          draft.subject,
          draft.date,
          draft.time,
          draft.location,
          draft.notes,
          timestamp,
          timestamp,
        ],
      );
      return toExam(await one<ExamRow>(message, "exams", EXAM_COLUMNS, id));
    },

    async updateExam(id, draft) {
      const message = "Could not save the exam.";
      await write(
        message,
        "UPDATE exams SET subject = ?, date = ?, time = ?, location = ?, notes = ?, updated_at = ? WHERE id = ?",
        [
          draft.subject,
          draft.date,
          draft.time,
          draft.location,
          draft.notes,
          now(),
          id,
        ],
      );
      return toExam(await one<ExamRow>(message, "exams", EXAM_COLUMNS, id));
    },

    async deleteExam(id) {
      const message = "Could not delete the exam.";
      // Unlink its tasks first, so none is left pointing at a missing exam.
      await write(
        message,
        "UPDATE tasks SET exam_id = NULL WHERE exam_id = ?",
        [id],
      );
      await write(message, "DELETE FROM exams WHERE id = ?", [id]);
    },

    async listProjects() {
      const rows = await db.select<ProjectRow>(
        `SELECT ${PROJECT_COLUMNS} FROM projects ORDER BY rowid`,
      );
      return rows.map(toProject);
    },

    async createProject({ id, name, color }) {
      const message = "Could not create the project.";
      const timestamp = now();
      await write(
        message,
        "INSERT INTO projects (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [id, name, color, timestamp, timestamp],
      );
      return toProject(
        await one<ProjectRow>(message, "projects", PROJECT_COLUMNS, id),
      );
    },

    async updateProject(id, { name, color }) {
      const message = "Could not save the project.";
      await write(
        message,
        "UPDATE projects SET name = ?, color = ?, updated_at = ? WHERE id = ?",
        [name, color, now(), id],
      );
      return toProject(
        await one<ProjectRow>(message, "projects", PROJECT_COLUMNS, id),
      );
    },

    async deleteProject(id) {
      const message = "Could not delete the project.";
      // Free its tasks first, so none is left pointing at a missing project.
      await write(
        message,
        "UPDATE tasks SET project_id = NULL WHERE project_id = ?",
        [id],
      );
      await write(message, "DELETE FROM projects WHERE id = ?", [id]);
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
