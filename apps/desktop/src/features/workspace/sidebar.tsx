import { APP_NAME } from "@atlas/core";
import {
  CalendarDays,
  Files,
  House,
  ListChecks,
  type LucideIcon,
  PanelLeft,
  Search,
  Settings,
} from "lucide-react";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const PAGES = [
  "home",
  "documents",
  "tasks",
  "schedule",
  "settings",
] as const;
export type Page = (typeof PAGES)[number];

export const SIDEBAR_MODES = ["expanded", "compact"] as const;
export type SidebarMode = (typeof SIDEBAR_MODES)[number];

interface Section {
  page: Page;
  label: string;
  icon: LucideIcon;
  /** Pressed with Command to go there. */
  key: string;
}

// The four sections of ATLAS, in the order they are always shown.
export const SECTIONS: Section[] = [
  { page: "home", label: "Home", icon: House, key: "1" },
  { page: "documents", label: "Documents", icon: Files, key: "2" },
  { page: "tasks", label: "Tasks & Exams", icon: ListChecks, key: "3" },
  { page: "schedule", label: "Schedule", icon: CalendarDays, key: "4" },
];

const APP: Section[] = [
  { page: "settings", label: "Settings", icon: Settings, key: "," },
];

/** The page a Command-key shortcut leads to, if it is one. */
export function pageForShortcut(key: string): Page | undefined {
  return [...SECTIONS, ...APP].find((destination) => destination.key === key)
    ?.page;
}

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
  /** Opens search and commands. */
  onSearch: () => void;
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
  /** Tasks due today or overdue, shown against Tasks. */
  dueCount: number;
  hasOverdue: boolean;
}

/**
 * The app's navigation. Expanded it shows icons with their names; compact it
 * is a rail of icons whose names appear as tooltips.
 */
export function Sidebar({
  page,
  onNavigate,
  onSearch,
  mode,
  onModeChange,
  dueCount,
  hasOverdue,
}: SidebarProps) {
  const compact = mode === "compact";

  function item({ page: target, label, icon: Icon, key }: Section) {
    const count = target === "tasks" ? dueCount : 0;
    const current = page === target;
    return (
      <li key={target}>
        <Tooltip
          label={
            compact && (
              <>
                {label}
                <kbd className="font-sans opacity-60">⌘{key}</kbd>
              </>
            )
          }
        >
          <button
            type="button"
            aria-current={current ? "page" : undefined}
            aria-label={
              count > 0 ? `${label}, ${count} due today or overdue` : label
            }
            onClick={() => onNavigate(target)}
            className={cn(
              "group relative flex h-9 w-full items-center gap-3 rounded-lg text-sm outline-none transition-[background-color,color,scale] duration-150 select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] motion-reduce:active:scale-100",
              compact ? "justify-center" : "px-2.5",
              current
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-foreground/6 hover:text-sidebar-foreground",
            )}
          >
            <Icon
              aria-hidden="true"
              strokeWidth={1.75}
              className="size-[1.125rem] shrink-0"
            />
            {!compact && (
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
            )}
            {count > 0 &&
              (compact ? (
                <span
                  className={cn(
                    "absolute top-1.5 right-3.5 size-1.5 rounded-full bg-signal",
                    hasOverdue && "bg-destructive",
                  )}
                />
              ) : (
                <span
                  className={cn(
                    "text-xs font-normal tabular-nums opacity-70",
                    hasOverdue && "text-destructive opacity-100",
                  )}
                >
                  {count}
                </span>
              ))}
          </button>
        </Tooltip>
      </li>
    );
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-atlas motion-reduce:transition-none",
          compact ? "w-[4.75rem]" : "w-52",
        )}
      >
        {/* The window's traffic lights sit over this strip; it also drags the window. */}
        <div data-tauri-drag-region className="h-12 shrink-0" />
        <p
          className={cn(
            "px-5 pb-4 font-heading text-xl tracking-tight",
            compact && "sr-only",
          )}
        >
          {APP_NAME}
        </p>

        <div className="px-3 pb-2">
          <Tooltip
            label={
              compact && (
                <>
                  Search
                  <kbd className="font-sans opacity-60">⌘K</kbd>
                </>
              )
            }
          >
            <button
              type="button"
              aria-label="Search"
              aria-keyshortcuts="Meta+K"
              onClick={onSearch}
              className={cn(
                "flex h-8 w-full items-center gap-3 rounded-lg border border-sidebar-border text-sm text-sidebar-foreground/60 outline-none transition-colors duration-150 select-none hover:bg-foreground/6 hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                compact ? "justify-center" : "px-2.5",
              )}
            >
              <Search
                aria-hidden="true"
                strokeWidth={1.75}
                className="size-4 shrink-0"
              />
              {!compact && (
                <>
                  <span className="flex-1 text-left">Search</span>
                  <kbd className="font-sans text-xs opacity-70">⌘K</kbd>
                </>
              )}
            </button>
          </Tooltip>
        </div>

        <nav
          aria-label="Sections"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3"
        >
          <ul className="grid gap-0.5">{SECTIONS.map(item)}</ul>
          <ul className="mt-auto grid gap-0.5 pt-4">{APP.map(item)}</ul>
        </nav>

        <div className="border-t border-sidebar-border px-3 py-2">
          <Tooltip label={compact && "Expand sidebar"}>
            <button
              type="button"
              aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!compact}
              onClick={() => onModeChange(compact ? "expanded" : "compact")}
              className={cn(
                "flex h-8 w-full items-center gap-3 rounded-lg text-sm text-sidebar-foreground/60 outline-none transition-colors duration-150 select-none hover:bg-foreground/6 hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                compact ? "justify-center" : "px-2.5",
              )}
            >
              <PanelLeft
                aria-hidden="true"
                strokeWidth={1.75}
                className="size-[1.125rem] shrink-0"
              />
              {!compact && <span>Collapse</span>}
            </button>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
