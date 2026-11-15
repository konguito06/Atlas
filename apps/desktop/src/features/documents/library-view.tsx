import {
  type AtlasData,
  DISPLAY_LOCALE,
  type DocumentSummary,
  findDocuments,
  type LibraryScope,
  useCreateDocument,
  useDocuments,
  useFolders,
  useOrganizeDocument,
} from "@atlas/core";
import {
  Files,
  Folder as FolderIcon,
  type LucideIcon,
  Star,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FolderDialog } from "./folder-dialog";

const editedFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * The document library: every document, the favourites, or one folder,
 * most recently edited first, with a search over titles.
 */
export function LibraryView({
  data,
  workspaceId,
  onOpen,
}: {
  data: AtlasData;
  workspaceId: string;
  onOpen: (documentId: string) => void;
}) {
  const documents = useDocuments(data, workspaceId);
  const folders = useFolders(data, workspaceId);
  const create = useCreateDocument(data, workspaceId);
  const organize = useOrganizeDocument(data, workspaceId);
  const [scope, setScope] = useState<LibraryScope>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [folderDialog, setFolderDialog] = useState<"create" | "edit">();

  const allFolders = folders.data ?? [];
  const folder =
    scope.kind === "folder"
      ? allFolders.find((item) => item.id === scope.folderId)
      : undefined;
  // A folder that has gone falls back to showing everything.
  const activeScope: LibraryScope =
    scope.kind === "folder" && !folder ? { kind: "all" } : scope;
  const found = findDocuments(documents.data ?? [], activeScope, query);
  const heading =
    folder?.name ??
    (activeScope.kind === "favorites" ? "Favourites" : "Documents");
  const error =
    documents.error ?? folders.error ?? create.error ?? organize.error;

  function createDocument() {
    create.mutate(
      { id: crypto.randomUUID(), folderId: folder?.id ?? null },
      { onSuccess: (created) => onOpen(created.id) },
    );
  }

  function place(
    label: string,
    icon: LucideIcon,
    target: LibraryScope,
    current: boolean,
  ) {
    const Icon = icon;
    return (
      <li key={label}>
        <button
          type="button"
          aria-current={current ? "page" : undefined}
          onClick={() => setScope(target)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors select-none focus-visible:ring-3 focus-visible:ring-ring/50",
            current
              ? "bg-accent font-medium text-accent-foreground"
              : "hover:bg-foreground/6",
          )}
        >
          <Icon
            aria-hidden="true"
            strokeWidth={1.75}
            className="size-4 shrink-0 opacity-70"
          />
          <span className="min-w-0 flex-1 truncate">{label}</span>
        </button>
      </li>
    );
  }

  return (
    <div className="flex h-full">
      <nav
        aria-label="Library"
        className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-border px-3 pt-14 pb-4"
      >
        <ul className="grid gap-0.5">
          {place(
            "All documents",
            Files,
            { kind: "all" },
            activeScope.kind === "all",
          )}
          {place(
            "Favourites",
            Star,
            { kind: "favorites" },
            activeScope.kind === "favorites",
          )}
        </ul>

        <p className="mt-6 px-2 text-xs text-muted-foreground">Folders</p>
        <ul aria-label="Folders" className="mt-1.5 grid gap-0.5">
          {allFolders.map((item) =>
            place(
              item.name,
              FolderIcon,
              { kind: "folder", folderId: item.id },
              folder?.id === item.id,
            ),
          )}
        </ul>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 justify-start px-2 font-normal text-muted-foreground"
          onClick={() => setFolderDialog("create")}
        >
          New folder
        </Button>
      </nav>

      <section className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-12 pt-14 pb-16">
          <div className="flex flex-wrap items-end gap-2">
            <h1 className="mr-auto font-heading text-4xl tracking-tight">
              {heading}
            </h1>
            {folder && (
              <Button variant="outline" onClick={() => setFolderDialog("edit")}>
                Edit folder
              </Button>
            )}
            <Button disabled={create.isPending} onClick={createDocument}>
              New document
            </Button>
          </div>

          <Input
            type="search"
            aria-label="Search documents"
            value={query}
            placeholder="Search by title"
            className="mt-8"
            onChange={(event) => setQuery(event.target.value)}
          />

          {error && (
            <div className="mt-4 flex items-center gap-3">
              <p role="alert" className="text-sm text-destructive">
                {error.message}
              </p>
              {documents.isError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => documents.refetch()}
                >
                  Try again
                </Button>
              )}
            </div>
          )}

          {documents.isSuccess && found.length === 0 && (
            <p className="mt-10 text-sm text-muted-foreground">
              {emptyText(activeScope, query, documents.data.length)}
            </p>
          )}

          {found.length > 0 && (
            <ul aria-label="Documents" className="mt-6 divide-y divide-border">
              {found.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  folderName={
                    // Naming the folder is only useful outside a folder.
                    folder
                      ? undefined
                      : allFolders.find((item) => item.id === document.folderId)
                          ?.name
                  }
                  onOpen={() => onOpen(document.id)}
                  onToggleFavorite={() =>
                    organize.mutate({
                      id: document.id,
                      favorite: !document.favorite,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      {folderDialog === "create" && (
        <FolderDialog
          data={data}
          workspaceId={workspaceId}
          onCreated={(created) =>
            setScope({ kind: "folder", folderId: created.id })
          }
          onClose={() => setFolderDialog(undefined)}
        />
      )}
      {folderDialog === "edit" && folder && (
        <FolderDialog
          data={data}
          workspaceId={workspaceId}
          folder={folder}
          onDeleted={() => setScope({ kind: "all" })}
          onClose={() => setFolderDialog(undefined)}
        />
      )}
    </div>
  );
}

function emptyText(scope: LibraryScope, query: string, total: number): string {
  if (query.trim()) return "No document's title matches that.";
  if (scope.kind === "favorites") {
    return "No favourites yet. Star a document to keep it here.";
  }
  if (scope.kind === "folder") return "This folder is empty.";
  return total === 0
    ? "No documents yet. Create one to start writing."
    : "No documents here.";
}

function DocumentRow({
  document,
  folderName,
  onOpen,
  onToggleFavorite,
}: {
  document: DocumentSummary;
  folderName?: string;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const title = document.title || "Untitled";
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <button
        type="button"
        aria-pressed={document.favorite}
        aria-label={`Favourite ${title}`}
        onClick={onToggleFavorite}
        className={cn(
          "rounded-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          document.favorite
            ? "text-signal"
            : "text-muted-foreground/50 hover:text-muted-foreground",
        )}
      >
        <Star
          aria-hidden="true"
          strokeWidth={1.75}
          className={cn("size-4", document.favorite && "fill-current")}
        />
      </button>
      <button
        type="button"
        aria-label={`Open ${title}`}
        onClick={onOpen}
        className={cn(
          "min-w-0 flex-1 truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
          !document.title && "font-normal text-muted-foreground",
        )}
      >
        {title}
      </button>
      {folderName && (
        <span className="shrink-0 text-muted-foreground">{folderName}</span>
      )}
      <span className="w-24 shrink-0 text-right text-muted-foreground tabular-nums">
        {editedFormat.format(new Date(document.updatedAt))}
      </span>
    </li>
  );
}
