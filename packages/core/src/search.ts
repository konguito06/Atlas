import type { DocumentSummary } from "./data";
import { describeDueDate, formatLocalDate } from "./dates";
import type { CalendarEvent } from "./events";
import type { Exam } from "./exams";
import type { Folder } from "./library";
import type { Project, Task } from "./tasks";
import { minutesToTime } from "./timetables";

// Search across the workspace. The same entries are what the assistant will
// later be given to find things in, so nothing here is tied to a screen.

export const SEARCH_KINDS = ["document", "task", "exam", "event"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

/** One thing that can be found. */
export interface SearchEntry {
  kind: SearchKind;
  id: string;
  title: string;
  /** A short line that tells it apart: a folder, a date, a project. */
  detail: string;
  /** Everything else that is searched: content, notes, a location. */
  body: string;
  /** For an event: the date to show it on. */
  date?: string;
}

export interface SearchResult extends SearchEntry {
  /** A piece of the body around the match, when the title did not match. */
  snippet?: string;
}

export interface SearchSources {
  documents: DocumentSummary[];
  /** Each document's words, as `documentToPlainText` gives them. */
  texts: Array<{ id: string; text: string }>;
  folders: Folder[];
  tasks: Task[];
  projects: Project[];
  exams: Exam[];
  events: CalendarEvent[];
}

/** Everything in the workspace that can be searched. */
export function buildSearchEntries(
  { documents, texts, folders, tasks, projects, exams, events }: SearchSources,
  today: string,
): SearchEntry[] {
  const textOf = new Map(texts.map((item) => [item.id, item.text]));
  const nameOf = <Named extends { id: string; name: string }>(
    items: Named[],
    id: string | null,
  ) => items.find((item) => item.id === id)?.name ?? "";

  return [
    ...documents.map(
      (document): SearchEntry => ({
        kind: "document",
        id: document.id,
        title: document.title || "Untitled",
        detail: nameOf(folders, document.folderId),
        body: textOf.get(document.id) ?? "",
      }),
    ),
    ...tasks.map(
      (task): SearchEntry => ({
        kind: "task",
        id: task.id,
        title: task.title,
        detail: [
          task.status === "done"
            ? "Done"
            : task.dueDate && describeDueDate(task.dueDate, today),
          nameOf(projects, task.projectId),
        ]
          .filter(Boolean)
          .join(", "),
        body: task.notes,
      }),
    ),
    ...exams.map(
      (exam): SearchEntry => ({
        kind: "exam",
        id: exam.id,
        title: exam.subject,
        detail: formatLocalDate(exam.date, today),
        body: [exam.location, exam.notes].filter(Boolean).join("\n"),
      }),
    ),
    ...events.map(
      (event): SearchEntry => ({
        kind: "event",
        id: event.id,
        title: event.title,
        detail:
          formatLocalDate(event.date, today) +
          (event.startMinute === null
            ? ""
            : ` at ${minutesToTime(event.startMinute)}`),
        body: [event.location, event.notes].filter(Boolean).join("\n"),
        date: event.date,
      }),
    ),
  ];
}

/**
 * Lower case and without accents, one character for one character, so that
 * "relatorio" finds "Relatório" and positions still line up with the text.
 */
function fold(text: string): string {
  return Array.from(text, (character) =>
    (character.normalize("NFD")[0] ?? character).toLowerCase(),
  ).join("");
}

/** The words a person typed, ready to match with. */
export function searchWords(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}

/** Whether every typed word appears in a label, for filtering commands. */
export function matchesWords(label: string, words: string[]): boolean {
  const folded = fold(label);
  return words.every((word) => folded.includes(word));
}

const SNIPPET_BEFORE = 30;
const SNIPPET_LENGTH = 90;

function snippetAround(body: string, at: number): string {
  // Start and end on whole words, never in the middle of one.
  const roughStart = Math.max(0, at - SNIPPET_BEFORE);
  const start = roughStart === 0 ? 0 : body.lastIndexOf(" ", roughStart) + 1;
  const roughEnd = start + SNIPPET_LENGTH;
  const end =
    roughEnd >= body.length
      ? body.length
      : Math.max(body.lastIndexOf(" ", roughEnd), at + 1);
  const text = body.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${text}${end < body.length ? "…" : ""}`;
}

/**
 * What matches a search, best first. Every word typed must appear in the
 * title or the body; a word found in the title counts for more than one
 * found only in the body, and most at the start of a word.
 */
export function searchEntries(
  entries: SearchEntry[],
  query: string,
  limit = 12,
): SearchResult[] {
  const words = searchWords(query);
  if (words.length === 0) return [];

  const scored: Array<{ result: SearchResult; score: number }> = [];
  for (const entry of entries) {
    const title = fold(entry.title);
    const body = fold(entry.body);
    let score = 0;
    let bodyMatch = -1;
    let matched = true;

    for (const word of words) {
      const inTitle = title.indexOf(word);
      if (inTitle !== -1) {
        const startsWord = inTitle === 0 || /\W/.test(title[inTitle - 1] ?? "");
        score += startsWord ? 4 : 3;
        continue;
      }
      const inBody = body.indexOf(word);
      if (inBody === -1) {
        matched = false;
        break;
      }
      score += 1;
      if (bodyMatch === -1) bodyMatch = inBody;
    }

    if (matched) {
      scored.push({
        score,
        result:
          bodyMatch === -1
            ? entry
            : { ...entry, snippet: snippetAround(entry.body, bodyMatch) },
      });
    }
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score || a.result.title.localeCompare(b.result.title),
    )
    .slice(0, limit)
    .map(({ result }) => result);
}
