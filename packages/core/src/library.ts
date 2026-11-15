import { z } from "zod";
import type { DocumentSummary } from "./data";
import type { Validated } from "./dates";

// The document library: how documents are organised and found. What a
// document contains is in document.ts.

/**
 * The kinds of document ATLAS can open. Only rich text exists so far; each
 * later kind (spreadsheet, presentation, code) gets its own editor and its
 * own content format, and is added here when that editor exists.
 */
export const DOCUMENT_TYPES = ["text"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const FOLDER_NAME_MAX_LENGTH = 100;

export interface Folder {
  id: string;
  name: string;
}

const folderName = z
  .string()
  .trim()
  .min(1, "Give the folder a name.")
  .max(
    FOLDER_NAME_MAX_LENGTH,
    `Keep the name under ${FOLDER_NAME_MAX_LENGTH} characters.`,
  );

export function validateFolderName(name: string): Validated<string> {
  const parsed = folderName.safeParse(name);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Check the name.",
      };
}

/** Which part of the library is on show. */
export type LibraryScope =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "folder"; folderId: string };

/**
 * The documents in one part of the library that match what was typed, most
 * recently edited first. Every word typed must appear in the title, in any
 * order and any case.
 */
export function findDocuments(
  documents: DocumentSummary[],
  scope: LibraryScope,
  query = "",
): DocumentSummary[] {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return documents
    .filter(
      (document) =>
        scope.kind === "all" ||
        (scope.kind === "favorites"
          ? document.favorite
          : document.folderId === scope.folderId),
    )
    .filter((document) => {
      const title = document.title.toLocaleLowerCase();
      return words.every((word) => title.includes(word));
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface FoldersData {
  /** Oldest first. */
  listFolders(workspaceId: string): Promise<Folder[]>;
  createFolder(input: {
    id: string;
    workspaceId: string;
    name: string;
  }): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<Folder>;
  /** Its documents are kept and simply leave the folder. */
  deleteFolder(id: string): Promise<void>;
}
