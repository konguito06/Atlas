import {
  type AtlasClient,
  type AtlasData,
  type DocumentSummary,
  signOut,
  useCreateDocument,
  useDocuments,
  useWorkspaces,
  type Workspace,
} from "@atlas/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeadlinesView } from "@/features/deadlines/deadlines-view";
import { DocumentPane } from "@/features/documents/document-pane";
import { TimetableView } from "@/features/timetable/timetable-view";
import { cn } from "@/lib/utils";

interface WorkspaceScreenProps {
  client: AtlasClient;
  data: AtlasData;
  email: string;
}

export function WorkspaceScreen({ client, data, email }: WorkspaceScreenProps) {
  const workspaces = useWorkspaces(data);

  if (workspaces.isPending) {
    return null;
  }
  if (workspaces.isError) {
    return (
      <Notice
        message={workspaces.error.message}
        action="Try again"
        onAction={() => workspaces.refetch()}
      />
    );
  }

  const workspace = workspaces.data[0];
  if (!workspace) {
    return <Notice message="You are not a member of any workspace." />;
  }
  return (
    <WorkspaceLayout
      client={client}
      data={data}
      email={email}
      workspace={workspace}
    />
  );
}

/** What the main pane shows. A document view may not name a document yet. */
type View =
  | { kind: "documents"; documentId?: string }
  | { kind: "deadlines" }
  | { kind: "timetable" };

function WorkspaceLayout({
  client,
  data,
  email,
  workspace,
}: WorkspaceScreenProps & { workspace: Workspace }) {
  const documents = useDocuments(data, workspace.id);
  const create = useCreateDocument(data, workspace.id);
  const [view, setView] = useState<View>({ kind: "documents" });
  const [signOutError, setSignOutError] = useState<string>();

  // Falls back to the newest document, so something is open after a
  // delete and on first load.
  const selected =
    view.kind === "documents"
      ? (documents.data?.find((document) => document.id === view.documentId) ??
        documents.data?.[0])
      : undefined;

  function createDocument() {
    create.mutate(crypto.randomUUID(), {
      onSuccess: (created) =>
        setView({ kind: "documents", documentId: created.id }),
    });
  }

  async function handleSignOut() {
    setSignOutError(undefined);
    const result = await signOut(client);
    // On success the session listener replaces this screen.
    if (!result.ok) setSignOutError(result.message);
  }

  return (
    <div className="flex h-svh">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="px-4 pt-5 pb-3">
          <p className="truncate font-heading text-lg">{workspace.name}</p>
        </div>

        <nav aria-label="Planning" className="px-3">
          <ul className="grid gap-0.5">
            <li>
              <SidebarLink
                selected={view.kind === "deadlines"}
                onSelect={() => setView({ kind: "deadlines" })}
              >
                Deadlines
              </SidebarLink>
            </li>
            <li>
              <SidebarLink
                selected={view.kind === "timetable"}
                onSelect={() => setView({ kind: "timetable" })}
              >
                Timetable
              </SidebarLink>
            </li>
          </ul>
        </nav>

        <div className="mt-5 px-3">
          <p className="px-2 pb-1.5 text-xs text-muted-foreground">Documents</p>
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
          className="mt-2 flex-1 overflow-y-auto px-3"
        >
          <ul className="grid gap-0.5">
            {documents.data?.map((document) => (
              <li key={document.id}>
                <SidebarLink
                  selected={document.id === selected?.id}
                  muted={!document.title}
                  onSelect={() =>
                    setView({ kind: "documents", documentId: document.id })
                  }
                >
                  {titleOf(document)}
                </SidebarLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border px-3 py-3">
          <p className="truncate px-1 text-xs text-muted-foreground">{email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
          {signOutError && (
            <p role="alert" className="px-1 text-xs text-destructive">
              {signOutError}
            </p>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {view.kind === "deadlines" && (
          <DeadlinesView data={data} workspaceId={workspace.id} />
        )}
        {view.kind === "timetable" && (
          <TimetableView data={data} workspaceId={workspace.id} />
        )}
        {view.kind === "documents" && (
          <>
            {create.isError && (
              <p role="alert" className="px-12 pt-4 text-sm text-destructive">
                {create.error.message}
              </p>
            )}
            {documents.isError ? (
              <Notice
                message={documents.error.message}
                action="Try again"
                onAction={() => documents.refetch()}
              />
            ) : selected ? (
              <DocumentPane
                key={selected.id}
                data={data}
                workspaceId={workspace.id}
                document={selected}
              />
            ) : (
              documents.isSuccess && (
                <Notice
                  title="No documents yet"
                  message="Create a document to start writing."
                  action="New document"
                  onAction={createDocument}
                />
              )
            )}
          </>
        )}
      </main>
    </div>
  );
}

function titleOf(document: DocumentSummary): string {
  return document.title || "Untitled";
}

function SidebarLink({
  selected,
  muted,
  onSelect,
  children,
}: {
  selected: boolean;
  muted?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={selected ? "page" : undefined}
      onClick={onSelect}
      className={cn(
        "w-full truncate rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "bg-sidebar-accent font-medium",
        muted && "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** A centred message for empty and failed states, with one way forward. */
function Notice({
  title,
  message,
  action,
  onAction,
}: {
  title?: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
      {title && <h2 className="font-heading text-2xl">{title}</h2>}
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && onAction && (
        <Button variant="outline" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
