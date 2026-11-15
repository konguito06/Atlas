import {
  type AssistantEngine,
  type AtlasData,
  groupTasks,
  toLocalDate,
  useTasks,
  useWorkspaces,
  type Workspace,
} from "@atlas/core";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/features/command/command-palette";
import { DocumentsView } from "@/features/documents/documents-view";
import { ScheduleView } from "@/features/schedule/schedule-view";
import { SettingsView } from "@/features/settings/settings-view";
import { TasksExamsView } from "@/features/tasks/tasks-exams-view";
import { TodayView } from "@/features/today/today-view";
import { useAppearance } from "@/lib/appearance";
import { usePreference } from "@/lib/preferences";
import { useNow } from "@/lib/use-now";
import type { Destination } from "./destination";
import { pageForShortcut, SIDEBAR_MODES, Sidebar } from "./sidebar";

export function WorkspaceScreen({
  data,
  assistant,
}: {
  data: AtlasData;
  assistant?: AssistantEngine;
}) {
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
  return (
    <WorkspaceLayout data={data} assistant={assistant} workspace={workspace} />
  );
}

function WorkspaceLayout({
  data,
  assistant,
  workspace,
}: {
  data: AtlasData;
  assistant?: AssistantEngine;
  workspace: Workspace;
}) {
  // Where the app is, and how many moves it took to get there. The count
  // makes a move to the section already on show start that section afresh.
  const [place, setPlace] = useState<Destination & { visit: number }>({
    page: "home",
    visit: 0,
  });
  const go = useCallback(
    (destination: Destination) =>
      setPlace(({ visit }) => ({ ...destination, visit: visit + 1 })),
    [],
  );
  const { page } = place;
  const [searching, setSearching] = useState(false);
  const [appearance, setAppearance] = useAppearance();
  const [sidebar, setSidebar] = usePreference(
    "atlas.sidebar",
    SIDEBAR_MODES,
    "expanded",
  );
  const tasks = useTasks(data, workspace.id);
  const today = toLocalDate(useNow());
  const due = groupTasks(tasks.data ?? [], today);

  // Command with a number goes to a section, Command-comma opens Settings,
  // and Command-K opens search.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (!event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return;
      }
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearching((open) => !open);
        return;
      }
      const target = pageForShortcut(event.key);
      if (target) {
        event.preventDefault();
        go({ page: target });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [go]);

  return (
    <div className="flex h-svh">
      <Sidebar
        page={page}
        onNavigate={(target) => go({ page: target })}
        onSearch={() => setSearching(true)}
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
          {/* Keyed by visit, so each page settles in as it opens. */}
          <div key={place.visit} className="atlas-enter h-full">
            {page === "home" && (
              <TodayView
                data={data}
                assistant={assistant}
                workspaceId={workspace.id}
                onOpen={(target) => go({ page: target })}
                onOpenTimetable={() =>
                  go({ page: "schedule", scheduleArea: "timetable" })
                }
                onOpenExams={() => go({ page: "tasks", tasksArea: "exams" })}
                onOpenDocument={(documentId) =>
                  go({ page: "documents", documentId })
                }
              />
            )}
            {page === "tasks" && (
              <TasksExamsView
                data={data}
                workspaceId={workspace.id}
                initialArea={place.tasksArea}
                initialTaskId={place.taskId}
                initialExamId={place.examId}
              />
            )}
            {page === "schedule" && (
              <ScheduleView
                data={data}
                workspaceId={workspace.id}
                initialArea={place.scheduleArea}
                initialDate={place.date}
                initialEventId={place.eventId}
              />
            )}
            {page === "documents" && (
              <DocumentsView
                data={data}
                workspaceId={workspace.id}
                initialDocumentId={place.documentId}
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

      <CommandPalette
        data={data}
        workspaceId={workspace.id}
        open={searching}
        onOpenChange={setSearching}
        onGo={go}
      />
    </div>
  );
}
