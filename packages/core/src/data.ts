import { createDeadlinesData, type DeadlinesData } from "./deadlines";
import type { AtlasClient } from "./supabase";
import { createTimetablesData, type TimetablesData } from "./timetables";

export const DOCUMENT_TITLE_MAX_LENGTH = 300;

export interface Workspace {
  id: string;
  name: string;
}

/** A document as lists show it: everything except its content. */
export interface DocumentSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Everything the apps read and write. Screens depend on this interface, so
 * tests can swap in an in-memory version.
 */
export interface AtlasData extends DeadlinesData, TimetablesData {
  listWorkspaces(): Promise<Workspace[]>;
  /** Newest first. */
  listDocuments(workspaceId: string): Promise<DocumentSummary[]>;
  /** The caller picks the id, so a document can later be created offline. */
  createDocument(input: {
    id: string;
    workspaceId: string;
  }): Promise<DocumentSummary>;
  renameDocument(id: string, title: string): Promise<DocumentSummary>;
  deleteDocument(id: string): Promise<void>;
}

const SUMMARY_COLUMNS = "id, title, created_at, updated_at";

interface SummaryRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function toSummary(row: SummaryRow): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createAtlasData(client: AtlasClient): AtlasData {
  return {
    ...createDeadlinesData(client),
    ...createTimetablesData(client),

    async listWorkspaces() {
      const { data, error } = await client
        .from("workspaces")
        .select("id, name")
        .order("created_at");
      if (error) throw new Error("Could not load your workspaces.");
      return data;
    },

    async listDocuments(workspaceId) {
      const { data, error } = await client
        .from("documents")
        .select(SUMMARY_COLUMNS)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .order("id");
      if (error) throw new Error("Could not load your documents.");
      return data.map(toSummary);
    },

    async createDocument({ id, workspaceId }) {
      const { data, error } = await client
        .from("documents")
        .insert({ id, workspace_id: workspaceId })
        .select(SUMMARY_COLUMNS)
        .single();
      if (error) throw new Error("Could not create the document.");
      return toSummary(data);
    },

    async renameDocument(id, title) {
      const { data, error } = await client
        .from("documents")
        .update({ title })
        .eq("id", id)
        .select(SUMMARY_COLUMNS)
        .single();
      if (error) throw new Error("Could not rename the document.");
      return toSummary(data);
    },

    async deleteDocument(id) {
      const { error } = await client.from("documents").delete().eq("id", id);
      if (error) throw new Error("Could not delete the document.");
    },
  };
}
