import { type AtlasData, useCreateDocument, useDocuments } from "@atlas/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DocumentPane } from "./document-pane";

/** The documents page: the list on the left, the open document beside it. */
export function DocumentsView({
  data,
  workspaceId,
  initialDocumentId,
}: {
  data: AtlasData;
  workspaceId: string;
  /** The document to show first, when arriving from a link to it. */
  initialDocumentId?: string;
}) {
  const documents = useDocuments(data, workspaceId);
  const create = useCreateDocument(data, workspaceId);
  const [selectedId, setSelectedId] = useState(initialDocumentId);

  // Falls back to the newest document, so something is open after a
  // delete and on first load.
  const selected =
    documents.data?.find((document) => document.id === selectedId) ??
    documents.data?.[0];

  function createDocument() {
    create.mutate(crypto.randomUUID(), {
      onSuccess: (created) => setSelectedId(created.id),
    });
  }

  return (
    <div className="flex h-full">
      <div className="flex w-60 shrink-0 flex-col border-r border-border pt-14">
        <h1 className="px-5 font-heading text-xl">Documents</h1>
        <div className="mt-4 px-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={create.isPending}
            onClick={createDocument}
          >
            New document
          </Button>
        </div>
        <nav
          aria-label="Documents"
          className="mt-2 flex-1 overflow-y-auto px-3 pb-4"
        >
          <ul className="grid gap-0.5">
            {documents.data?.map((document) => (
              <li key={document.id}>
                <button
                  type="button"
                  aria-current={
                    document.id === selected?.id ? "page" : undefined
                  }
                  onClick={() => setSelectedId(document.id)}
                  className={cn(
                    "w-full truncate rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-foreground/6 focus-visible:ring-3 focus-visible:ring-ring/50",
                    document.id === selected?.id &&
                      "bg-accent font-medium text-accent-foreground hover:bg-accent",
                    !document.title && "text-muted-foreground",
                  )}
                >
                  {document.title || "Untitled"}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {create.isError && (
          <p role="alert" className="px-12 pt-14 text-sm text-destructive">
            {create.error.message}
          </p>
        )}
        {documents.isError ? (
          <Message
            text={documents.error.message}
            action="Try again"
            onAction={() => documents.refetch()}
          />
        ) : selected ? (
          <DocumentPane
            key={selected.id}
            data={data}
            workspaceId={workspaceId}
            document={selected}
          />
        ) : (
          documents.isSuccess && (
            <Message
              title="No documents yet"
              text="Create a document to start writing."
              action="New document"
              onAction={createDocument}
            />
          )
        )}
      </div>
    </div>
  );
}

function Message({
  title,
  text,
  action,
  onAction,
}: {
  title?: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
      {title && <h2 className="font-heading text-2xl">{title}</h2>}
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button variant="outline" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}
