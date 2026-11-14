import {
  type AtlasData,
  createEmptyDocument,
  type DocumentSummary,
  type Project,
  type Task,
  type Timetable,
  type TimetableEntry,
} from "@atlas/core";
import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { App } from "../App";

export function documentNamed(title: string, id = title): DocumentSummary {
  return {
    id,
    title,
    createdAt: "2026-11-13T10:00:00.000Z",
    updatedAt: "2026-11-13T10:00:00.000Z",
  };
}

interface FakeSeed {
  documents?: DocumentSummary[];
  /** Stored content by document id; anything missing is an empty document. */
  contents?: Record<string, unknown>;
  tasks?: Task[];
  projects?: Project[];
  timetables?: Timetable[];
  entries?: TimetableEntry[];
  /** Operations that should reject, to exercise error states. */
  failing?: Array<"list" | "rename" | "saveTask" | "saveEntry" | "saveContent">;
}

/** A task for tests: only what matters to the test needs passing. */
export function taskNamed(title: string, extra: Partial<Task> = {}): Task {
  return {
    id: title,
    title,
    notes: "",
    status: "todo",
    priority: "none",
    dueDate: null,
    dueTime: null,
    projectId: null,
    parentId: null,
    completedAt: null,
    createdAt: "2026-11-01T10:00:00.000Z",
    ...extra,
  };
}

/** Keeps everything in memory, behaving like the real data layer. */
export function createFakeData(seed: FakeSeed = {}): AtlasData {
  let documents = [...(seed.documents ?? [])];
  const contents: Record<string, unknown> = { ...seed.contents };
  let tasks = [...(seed.tasks ?? [])];
  let projects = [...(seed.projects ?? [])];
  let timetables = [...(seed.timetables ?? [])];
  let entries = [...(seed.entries ?? [])];
  const failing = seed.failing ?? [];

  return {
    listWorkspaces: async () => [{ id: "workspace-1", name: "Personal" }],
    listDocuments: async () => {
      if (failing.includes("list")) {
        throw new Error("Could not load your documents.");
      }
      return documents;
    },
    createDocument: async ({ id }) => {
      const created = documentNamed("", id);
      documents = [created, ...documents];
      return created;
    },
    renameDocument: async (id, title) => {
      if (failing.includes("rename")) {
        throw new Error("Could not rename the document.");
      }
      const renamed = { ...documentNamed(title, id) };
      documents = documents.map((document) =>
        document.id === id ? renamed : document,
      );
      return renamed;
    },
    getDocumentContent: async (id) => contents[id] ?? createEmptyDocument(),
    saveDocumentContent: async (id, content) => {
      const current = documents.find((document) => document.id === id);
      if (!current || failing.includes("saveContent")) {
        throw new Error("Could not save the document.");
      }
      contents[id] = content;
      return current;
    },
    deleteDocument: async (id) => {
      documents = documents.filter((document) => document.id !== id);
    },

    listTasks: async () => tasks,
    createTask: async ({ id, workspaceId: _workspaceId, ...draft }) => {
      if (failing.includes("saveTask")) {
        throw new Error("Could not add the task.");
      }
      const created: Task = {
        id,
        ...draft,
        status: "todo",
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      tasks = [...tasks, created];
      return created;
    },
    updateTask: async (id, change) => {
      const current = tasks.find((task) => task.id === id);
      if (!current || failing.includes("saveTask")) {
        throw new Error("Could not save the task.");
      }
      const saved: Task = {
        ...current,
        ...change,
        ...(change.status !== undefined && {
          completedAt:
            change.status === "done" ? new Date().toISOString() : null,
        }),
      };
      tasks = tasks.map((task) => (task.id === id ? saved : task));
      return saved;
    },
    deleteTask: async (id) => {
      tasks = tasks.filter((task) => task.id !== id && task.parentId !== id);
    },
    listProjects: async () => projects,
    createProject: async ({ id, name, color }) => {
      const created = { id, name, color };
      projects = [...projects, created];
      return created;
    },
    updateProject: async (id, draft) => {
      const saved = { id, ...draft };
      projects = projects.map((project) =>
        project.id === id ? saved : project,
      );
      return saved;
    },
    deleteProject: async (id) => {
      projects = projects.filter((project) => project.id !== id);
      tasks = tasks.map((task) =>
        task.projectId === id ? { ...task, projectId: null } : task,
      );
    },

    listTimetables: async () => timetables,
    createTimetable: async ({ id, workspaceId: _workspaceId, ...settings }) => {
      const created = { id, ...settings };
      timetables = [...timetables, created];
      return created;
    },
    updateTimetable: async (id, settings) => {
      const saved = { id, ...settings };
      timetables = timetables.map((timetable) =>
        timetable.id === id ? saved : timetable,
      );
      return saved;
    },
    deleteTimetable: async (id) => {
      timetables = timetables.filter((timetable) => timetable.id !== id);
      entries = entries.filter((entry) => entry.timetableId !== id);
    },
    listTimetableEntries: async (timetableId) =>
      entries.filter((entry) => entry.timetableId === timetableId),
    createTimetableEntry: async (entry) => {
      if (failing.includes("saveEntry")) {
        throw new Error("Could not add the entry.");
      }
      entries = [...entries, entry];
      return entry;
    },
    updateTimetableEntry: async (id, draft) => {
      const current = entries.find((entry) => entry.id === id);
      if (!current || failing.includes("saveEntry")) {
        throw new Error("Could not save the entry.");
      }
      const saved = { ...current, ...draft };
      entries = entries.map((entry) => (entry.id === id ? saved : entry));
      return saved;
    },
    deleteTimetableEntry: async (id) => {
      entries = entries.filter((entry) => entry.id !== id);
    },
  };
}

/** Renders the whole app over the given data. */
export function renderApp(data: AtlasData) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<App data={data} queryClient={queryClient} />);
}
