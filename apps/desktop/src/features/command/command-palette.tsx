import {
  type AtlasData,
  buildSearchEntries,
  EMPTY_TASK_DRAFT,
  matchesWords,
  type SearchKind,
  type SearchResult,
  searchEntries,
  searchWords,
  toLocalDate,
  useCreateDocument,
  useCreateTask,
  useDocuments,
  useDocumentTexts,
  useEvents,
  useExams,
  useFolders,
  useProjects,
  useTasks,
  validateTask,
} from "@atlas/core";
import {
  CalendarDays,
  CornerDownLeft,
  FilePlus,
  FileText,
  GraduationCap,
  type LucideIcon,
  Plus,
  Search,
  SquareCheck,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Destination } from "@/features/workspace/destination";
import { SECTIONS } from "@/features/workspace/sidebar";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const KINDS: Record<SearchKind, { label: string; icon: LucideIcon }> = {
  document: { label: "Document", icon: FileText },
  task: { label: "Task", icon: SquareCheck },
  exam: { label: "Exam", icon: GraduationCap },
  event: { label: "Event", icon: CalendarDays },
};

/** One line in the palette: somewhere to go, something to do, or a find. */
interface Item {
  id: string;
  group: "Go to" | "Actions" | "Found";
  label: string;
  icon: LucideIcon;
  /** Said after the label: a kind, a date, a folder. */
  detail?: string;
  snippet?: string;
  run: () => void;
}

const PLACES: Array<{ label: string; icon: LucideIcon; to: Destination }> = [
  ...SECTIONS.map(({ label, icon, page }) => ({ label, icon, to: { page } })),
  {
    label: "Exams",
    icon: GraduationCap,
    to: { page: "tasks", tasksArea: "exams" },
  },
  {
    label: "Deadlines",
    icon: SquareCheck,
    to: { page: "tasks", tasksArea: "deadlines" },
  },
  {
    label: "Timetable",
    icon: CalendarDays,
    to: { page: "schedule", scheduleArea: "timetable" },
  },
];

function destinationOf(result: SearchResult): Destination {
  switch (result.kind) {
    case "document":
      return { page: "documents", documentId: result.id };
    case "task":
      return { page: "tasks", taskId: result.id };
    case "exam":
      return { page: "tasks", examId: result.id };
    case "event":
      return { page: "schedule", date: result.date, eventId: result.id };
  }
}

interface CommandPaletteProps {
  data: AtlasData;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGo: (destination: Destination) => void;
}

/**
 * Search and commands in one place, opened with Command-K. Type to find a
 * document, task, exam or event, to go to a section, or to add a task.
 */
export function CommandPalette({
  data,
  workspaceId,
  open,
  onOpenChange,
  onGo,
}: CommandPaletteProps) {
  const listId = useId();
  const today = toLocalDate(useNow());
  const documents = useDocuments(data, workspaceId);
  // Document contents are only read while the palette is open.
  const texts = useDocumentTexts(data, workspaceId, open);
  const folders = useFolders(data, workspaceId);
  const tasks = useTasks(data, workspaceId);
  const projects = useProjects(data, workspaceId);
  const exams = useExams(data, workspaceId);
  const events = useEvents(data, workspaceId);
  const createTask = useCreateTask(data, workspaceId);
  const createDocument = useCreateDocument(data, workspaceId);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const error = createTask.error ?? createDocument.error;

  const entries = useMemo(
    () =>
      buildSearchEntries(
        {
          documents: documents.data ?? [],
          texts: texts.data ?? [],
          folders: folders.data ?? [],
          tasks: tasks.data ?? [],
          projects: projects.data ?? [],
          exams: exams.data ?? [],
          events: events.data ?? [],
        },
        today,
      ),
    [
      documents.data,
      texts.data,
      folders.data,
      tasks.data,
      projects.data,
      exams.data,
      events.data,
      today,
    ],
  );

  function close() {
    onOpenChange(false);
  }
  function go(destination: Destination) {
    onGo(destination);
    close();
  }

  const words = searchWords(query);
  const typed = query.trim();
  const task = validateTask({ ...EMPTY_TASK_DRAFT, title: typed });
  const items: Item[] = [
    ...PLACES.filter(
      // With nothing typed, only the four sections are offered.
      (place, index) =>
        typed ? matchesWords(place.label, words) : index < SECTIONS.length,
    ).map(
      (place): Item => ({
        id: `go-${place.label}`,
        group: "Go to",
        label: place.label,
        icon: place.icon,
        run: () => go(place.to),
      }),
    ),
    ...searchEntries(entries, query, 8).map(
      (result): Item => ({
        id: `${result.kind}-${result.id}`,
        group: "Found",
        label: result.title,
        icon: KINDS[result.kind].icon,
        detail: [KINDS[result.kind].label, result.detail]
          .filter(Boolean)
          .join(", "),
        snippet: result.snippet,
        run: () => go(destinationOf(result)),
      }),
    ),
    ...(!typed || matchesWords("New document", words)
      ? [
          {
            id: "new-document",
            group: "Actions",
            label: "New document",
            icon: FilePlus,
            run: () =>
              createDocument.mutate(crypto.randomUUID(), {
                onSuccess: (created) =>
                  go({ page: "documents", documentId: created.id }),
              }),
          } satisfies Item,
        ]
      : []),
    ...(task.ok
      ? [
          {
            id: "add-task",
            group: "Actions",
            label: `Add task “${task.value.title}”`,
            icon: Plus,
            run: () =>
              createTask.mutate(
                { id: crypto.randomUUID(), ...task.value },
                { onSuccess: () => go({ page: "tasks" }) },
              ),
          } satisfies Item,
        ]
      : []),
  ];
  const current = items[Math.min(active, items.length - 1)];

  // Start clean each time it opens, however it was closed.
  const resetTask = createTask.reset;
  const resetDocument = createDocument.reset;
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      resetTask();
      resetDocument();
    }
  }, [open, resetTask, resetDocument]);

  // Keep the highlighted line in view while moving through a long list.
  useEffect(() => {
    if (current) {
      document
        .getElementById(current.id)
        ?.scrollIntoView?.({ block: "nearest" });
    }
  }, [current]);

  function handleKey(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const from = Math.min(active, items.length - 1);
      setActive((from + step + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      current?.run();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[16%] flex max-h-[min(32rem,70svh)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search and commands</DialogTitle>
        <DialogDescription className="sr-only">
          Find a document, task, exam or event, go to a section, or add a task.
        </DialogDescription>

        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search
            aria-hidden="true"
            strokeWidth={1.75}
            className="size-4 shrink-0 text-muted-foreground"
          />
          <input
            role="combobox"
            aria-label="Search or type a command"
            aria-expanded={items.length > 0}
            aria-controls={listId}
            aria-activedescendant={current?.id}
            aria-autocomplete="list"
            value={query}
            placeholder="Search, go somewhere, or add a task"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={handleKey}
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>

        {error && (
          <p role="alert" className="px-4 pt-3 text-sm text-destructive">
            {error.message}
          </p>
        )}

        <div
          id={listId}
          role="listbox"
          aria-label="Results"
          className="min-h-0 flex-1 overflow-y-auto p-2"
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const selected = item === current;
            const startsGroup = items[index - 1]?.group !== item.group;
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled on the input, which keeps the focus
              <div
                key={item.id}
                id={item.id}
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onClick={item.run}
                onMouseMove={() => setActive(index)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm select-none",
                  startsGroup && index > 0 && "mt-2",
                  selected && "bg-accent text-accent-foreground",
                )}
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-4 shrink-0 opacity-70"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {item.label}
                  </span>
                  {item.snippet && (
                    <span className="block truncate text-xs opacity-70">
                      {item.snippet}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs opacity-70">
                  {item.detail ?? item.group}
                </span>
                {selected && (
                  <CornerDownLeft
                    aria-hidden="true"
                    className="size-3.5 shrink-0 opacity-60"
                  />
                )}
              </div>
            );
          })}
        </div>
        {items.length === 0 && (
          <p className="px-4 pb-8 text-center text-sm text-muted-foreground">
            Nothing matches that.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
