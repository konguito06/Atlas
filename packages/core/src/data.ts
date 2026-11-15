import type { AtlasDocument } from "./document";
import type { EventsData } from "./events";
import type { ExamsData } from "./exams";
import type { DocumentType, FoldersData } from "./library";
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
  /** Which editor opens it. */
  type: DocumentType;
  favorite: boolean;
  /** The folder it is filed in, if any. */
  folderId: string | null;
  createdAt: string;
  /** When its title or content last changed; organising it does not count. */
  updatedAt: string;
}

/** A document's plain text, as search reads it. */
export interface DocumentText {
  id: string;
  text: string;
}

/**
 * Everything the apps read and write. Screens depend on this interface, so
 * tests can swap in an in-memory version.
 */
export interface AtlasData
  extends TasksData,
    ExamsData,
    EventsData,
    FoldersData,
    TimetablesData {
  listWorkspaces(): Promise<Workspace[]>;
  /** Newest first. */
  listDocuments(workspaceId: string): Promise<DocumentSummary[]>;
  /** The caller picks the id, so a document can later be created offline. */
  createDocument(input: {
    id: string;
    workspaceId: string;
    /** File it in a folder straight away. */
    folderId?: string | null;
  }): Promise<DocumentSummary>;
  /** Marks it as a favourite or files it; null takes it out of its folder. */
  organizeDocument(
    id: string,
    change: { favorite?: boolean; folderId?: string | null },
  ): Promise<DocumentSummary>;
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
  /**
   * Every document's words without formatting, for search. A document whose
   * content cannot be read has no words.
   */
  listDocumentTexts(workspaceId: string): Promise<DocumentText[]>;
}
