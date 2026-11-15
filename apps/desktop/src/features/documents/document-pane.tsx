import {
  type AtlasData,
  DISPLAY_LOCALE,
  DOCUMENT_TITLE_MAX_LENGTH,
  type DocumentSummary,
  type Folder,
  parseDocument,
  useDeleteDocument,
  useDocumentContent,
  useOrganizeDocument,
  useRenameDocument,
  useSaveDocumentContent,
} from "@atlas/core";
import { ChevronLeft, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { DocumentEditor } from "./editor/document-editor";

const editedAtFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** The open document. Remount it (with `key`) when another one is opened. */
export function DocumentPane({
  data,
  workspaceId,
  document,
  folders,
  onBack,
}: {
  data: AtlasData;
  workspaceId: string;
  document: DocumentSummary;
  /** The folders it can be filed in. */
  folders: Folder[];
  /** Returns to the library. */
  onBack: () => void;
}) {
  const rename = useRenameDocument(data, workspaceId);
  const remove = useDeleteDocument(data, workspaceId);
  const content = useDocumentContent(data, document.id);
  const saveContent = useSaveDocumentContent(data, workspaceId);
  const organize = useOrganizeDocument(data, workspaceId);
  const [title, setTitle] = useState(document.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function saveTitle() {
    if (title !== document.title) {
      rename.mutate({ id: document.id, title });
    }
  }

  const error = rename.error ?? remove.error ?? organize.error ?? content.error;
  const parsed = content.isSuccess ? parseDocument(content.data) : undefined;

  return (
    <article className="mx-auto w-full max-w-2xl px-12 pt-14 pb-16">
      <div className="flex min-h-8 items-center justify-end gap-2">
        {!confirmingDelete && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto -ml-2 text-muted-foreground"
              onClick={onBack}
            >
              <ChevronLeft data-icon="inline-start" />
              Documents
            </Button>
            {folders.length > 0 && (
              <NativeSelect
                aria-label="Folder"
                value={document.folderId ?? ""}
                className="h-7 w-40 text-[0.8rem]"
                onChange={(event) =>
                  organize.mutate({
                    id: document.id,
                    folderId: event.target.value || null,
                  })
                }
              >
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </NativeSelect>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-pressed={document.favorite}
              aria-label="Favourite"
              className={cn(
                document.favorite ? "text-signal" : "text-muted-foreground",
              )}
              onClick={() =>
                organize.mutate({
                  id: document.id,
                  favorite: !document.favorite,
                })
              }
            >
              <Star className={cn(document.favorite && "fill-current")} />
            </Button>
          </>
        )}
        {confirmingDelete ? (
          <>
            <p className="mr-auto text-sm text-muted-foreground">
              Delete this document? This can't be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate(document.id)}
            >
              {remove.isPending ? "Deleting…" : "Delete document"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={remove.isPending}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>

      <input
        aria-label="Document title"
        placeholder="Untitled"
        value={title}
        maxLength={DOCUMENT_TITLE_MAX_LENGTH}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={saveTitle}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        // biome-ignore lint/a11y/noAutofocus: a document with no title yet opens ready to be named
        autoFocus={document.title === ""}
        className="mt-6 w-full bg-transparent font-heading text-4xl tracking-tight outline-none placeholder:text-muted-foreground/50"
      />
      <p className="mt-3 text-sm text-muted-foreground">
        Last edited {editedAtFormat.format(new Date(document.updatedAt))}
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error.message}
        </p>
      )}

      <div className="mt-6">
        {parsed?.ok && (
          <DocumentEditor
            initial={parsed.document}
            onSave={(next) =>
              saveContent.mutateAsync({ id: document.id, content: next })
            }
          />
        )}
        {parsed && !parsed.ok && (
          <p className="text-sm text-muted-foreground">
            {parsed.reason === "newer-version"
              ? "This document was written with a newer version of ATLAS. Update the app to open it."
              : "This document's content is damaged and cannot be shown. Its title can still be changed."}
          </p>
        )}
      </div>
    </article>
  );
}
