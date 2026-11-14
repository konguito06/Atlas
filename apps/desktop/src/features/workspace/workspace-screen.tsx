import {
  APP_NAME,
  type AtlasData,
  groupDeadlines,
  toLocalDate,
  useDeadlines,
  useWorkspaces,
  type Workspace,
} from "@atlas/core";
import {
  CalendarDays,
  FileText,
  Flag,
  type LucideIcon,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeadlinesView } from "@/features/deadlines/deadlines-view";
import { DocumentsView } from "@/features/documents/documents-view";
import { TimetableView } from "@/features/timetable/timetable-view";
import { TodayView } from "@/features/today/today-view";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

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

type Page = "today" | "deadlines" | "timetable" | "documents";

const PAGES: Array<{ page: Page; label: string; icon: LucideIcon }> = [
  { page: "today", label: "Today", icon: Sun },
  { page: "deadlines", label: "Deadlines", icon: Flag },
  { page: "timetable", label: "Timetable", icon: CalendarDays },
  { page: "documents", label: "Documents", icon: FileText },
];

function WorkspaceLayout({
  data,
  workspace,
}: {
  data: AtlasData;
  workspace: Workspace;
}) {
  const [page, setPage] = useState<Page>("today");
  const deadlines = useDeadlines(data, workspace.id);
  const today = toLocalDate(useNow());
  const due = groupDeadlines(deadlines.data ?? [], today);
  const dueCount = due.overdue.length + due.today.length;

  return (
    <div className="flex h-svh">
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        {/* The window's traffic lights sit over this strip; it also drags the window. */}
        <div data-tauri-drag-region className="h-12 shrink-0" />
        <p className="px-5 pb-5 font-heading text-2xl tracking-tight">
          {APP_NAME}
        </p>

        <nav aria-label="Pages" className="px-3">
          <ul className="grid gap-0.5">
            {PAGES.map(({ page: target, label, icon: Icon }) => {
              const count = target === "deadlines" ? dueCount : 0;
              return (
                <li key={target}>
                  <button
                    type="button"
                    aria-current={page === target ? "page" : undefined}
                    aria-label={
                      count > 0
                        ? `${label}, ${count} due today or overdue`
                        : label
                    }
                    onClick={() => setPage(target)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                      page === target && "bg-sidebar-accent font-medium",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0 opacity-70"
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "text-xs tabular-nums text-muted-foreground",
                          due.overdue.length > 0 && "text-destructive",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="relative min-w-0 flex-1">
        {/* Keeps the top of the window draggable, where a title bar would be. */}
        <div
          data-tauri-drag-region
          className="absolute inset-x-0 top-0 z-10 h-8"
        />
        <main className="h-full overflow-y-auto">
          {page === "today" && (
            <TodayView
              data={data}
              workspaceId={workspace.id}
              onOpen={setPage}
            />
          )}
          {page === "deadlines" && (
            <DeadlinesView data={data} workspaceId={workspace.id} />
          )}
          {page === "timetable" && (
            <TimetableView data={data} workspaceId={workspace.id} />
          )}
          {page === "documents" && (
            <DocumentsView data={data} workspaceId={workspace.id} />
          )}
        </main>
      </div>
    </div>
  );
}
