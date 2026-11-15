import type { AtlasDocument } from "./document";
import type { ExamsData } from "./exams";
import type { TasksData } from "./tasks";
import type { TimetablesData } from "./timetables";

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
export interface AtlasData extends TasksData, ExamsData, TimetablesData {
  listWorkspaces(): Promise<Workspace[]>;
  /** Newest first. */
  listDocuments(workspaceId: string): Promise<DocumentSummary[]>;
  /** The caller picks the id, so a document can later be created offline. */
  createDocument(input: {
    id: string;
    workspaceId: string;
  }): Promise<DocumentSummary>;
  renameDocument(id: string, title: string): Promise<DocumentSummary>;
  /**
   * What is stored for the document, exactly as stored. Check it with
   * `parseDocument` before use: it may come from a newer app version.
   */
  getDocumentContent(id: string): Promise<unknown>;
  saveDocumentContent(
    id: string,
    content: AtlasDocument,
  ): Promise<DocumentSummary>;
  deleteDocument(id: string): Promise<void>;
}
