import {
  type AtlasData,
  groupTasks,
  toLocalDate,
  useTasks,
  useWorkspaces,
  type Workspace,
} from "@atlas/core";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentsView } from "@/features/documents/documents-view";
import { SettingsView } from "@/features/settings/settings-view";
import { TasksView } from "@/features/tasks/tasks-view";
import { TimetableView } from "@/features/timetable/timetable-view";
import { TodayView } from "@/features/today/today-view";
import { useAppearance } from "@/lib/appearance";
import { usePreference } from "@/lib/preferences";
import { useNow } from "@/lib/use-now";
import { type Page, pageForShortcut, SIDEBAR_MODES, Sidebar } from "./sidebar";

export function WorkspaceScreen({ data }: { data: AtlasData }) {
  const workspaces = useWorkspaces(data);

  if (workspaces.isPending) {
    return null;
  }
  const workspace = workspaces.data?.[0];
  if (!workspace) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {workspaces.error?.message ?? "Your data could not be loaded."}
        </p>
        <Button variant="outline" onClick={() => workspaces.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return <WorkspaceLayout data={data} workspace={workspace} />;
}

function WorkspaceLayout({
  data,
  workspace,
}: {
  data: AtlasData;
  workspace: Workspace;
}) {
  const [page, setPage] = useState<Page>("home");
  // Set when a document is opened from another page, so Documents shows it.
  const [documentToOpen, setDocumentToOpen] = useState<string>();
  const [appearance, setAppearance] = useAppearance();
  const [sidebar, setSidebar] = usePreference(
    "atlas.sidebar",
    SIDEBAR_MODES,
    "expanded",
  );
  const tasks = useTasks(data, workspace.id);
  const today = toLocalDate(useNow());
  const due = groupTasks(tasks.data ?? [], today);

  // Command with a number goes to a section; Command-comma opens Settings.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (!event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return;
      }
      const target = pageForShortcut(event.key);
      if (target) {
        event.preventDefault();
        setPage(target);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex h-svh">
      <Sidebar
        page={page}
        onNavigate={setPage}
        mode={sidebar}
        onModeChange={setSidebar}
        dueCount={due.overdue.length + due.today.length}
        hasOverdue={due.overdue.length > 0}
      />

      <div className="relative min-w-0 flex-1">
        {/* Keeps the top of the window draggable, where a title bar would be. */}
        <div
          data-tauri-drag-region
          className="absolute inset-x-0 top-0 z-10 h-8"
        />
        <main className="h-full overflow-y-auto">
          {/* Keyed by page, so each page settles in as it opens. */}
          <div key={page} className="atlas-enter h-full">
            {page === "home" && (
              <TodayView
                data={data}
                workspaceId={workspace.id}
                onOpen={setPage}
                onOpenDocument={(documentId) => {
                  setDocumentToOpen(documentId);
                  setPage("documents");
                }}
              />
            )}
            {page === "tasks" && (
              <TasksView data={data} workspaceId={workspace.id} />
            )}
            {page === "schedule" && (
              <TimetableView data={data} workspaceId={workspace.id} />
            )}
            {page === "documents" && (
              <DocumentsView
                data={data}
                workspaceId={workspace.id}
                initialDocumentId={documentToOpen}
              />
            )}
            {page === "settings" && (
              <SettingsView
                appearance={appearance}
                onAppearanceChange={setAppearance}
                sidebar={sidebar}
                onSidebarChange={setSidebar}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
