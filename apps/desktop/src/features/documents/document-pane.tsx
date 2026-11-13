import {
  type AtlasData,
  DISPLAY_LOCALE,
  DOCUMENT_TITLE_MAX_LENGTH,
  type DocumentSummary,
  useDeleteDocument,
  useRenameDocument,
} from "@atlas/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const editedAtFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** The open document. Remount it (with `key`) when another one is opened. */
export function DocumentPane({
  data,
  workspaceId,
  document,
}: {
  data: AtlasData;
  workspaceId: string;
  document: DocumentSummary;
}) {
  const rename = useRenameDocument(data, workspaceId);
  const remove = useDeleteDocument(data, workspaceId);
  const [title, setTitle] = useState(document.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function saveTitle() {
    if (title !== document.title) {
      rename.mutate({ id: document.id, title });
    }
  }

  const error = rename.error ?? remove.error;

  return (
    <article className="mx-auto w-full max-w-2xl px-12 pt-10 pb-16">
      <div className="flex min-h-8 items-center justify-end gap-2">
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
    </article>
  );
}
