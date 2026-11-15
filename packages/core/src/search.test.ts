import { describe, expect, test } from "vitest";
import {
  buildSearchEntries,
  matchesWords,
  type SearchEntry,
  searchEntries,
  searchWords,
} from "./search";
import { EMPTY_TASK_DRAFT } from "./tasks";

const TODAY = "2026-11-13";

const entry = (
  title: string,
  body = "",
  kind: SearchEntry["kind"] = "document",
): SearchEntry => ({ kind, id: title, title, detail: "", body });

describe("searchEntries", () => {
  const entries = [
    entry("Trip plan", "Three days in Lisbon. Book the night train early."),
    entry("Lisbon budget", "Flights and the hotel."),
    entry("Reading list", "Nothing about travel."),
    entry("Book the dentist", "", "task"),
    entry("Relatório final", "Conclusões e bibliografia."),
  ];
  const titles = (query: string) =>
    searchEntries(entries, query).map((result) => result.title);

  test("finds nothing for an empty search", () => {
    expect(searchEntries(entries, "   ")).toEqual([]);
  });

  test("puts a match in the title above a match in the content", () => {
    expect(titles("lisbon")).toEqual(["Lisbon budget", "Trip plan"]);
  });

  test("needs every word, in the title or the content", () => {
    expect(titles("lisbon train")).toEqual(["Trip plan"]);
    expect(titles("lisbon paris")).toEqual([]);
  });

  test("searches across kinds", () => {
    expect(titles("book")).toEqual(["Book the dentist", "Trip plan"]);
  });

  test("ignores case and accents", () => {
    expect(titles("RELATORIO")).toEqual(["Relatório final"]);
    expect(titles("conclusoes")).toEqual(["Relatório final"]);
  });

  test("a word at the start of a title word beats one in the middle", () => {
    const found = searchEntries(
      [entry("Notebook"), entry("Book list")],
      "book",
    );

    expect(found.map((result) => result.title)).toEqual([
      "Book list",
      "Notebook",
    ]);
  });

  test("shows the content around a match that is not in the title", () => {
    const [result] = searchEntries(entries, "night");

    expect(result?.snippet).toBe(
      "Three days in Lisbon. Book the night train early.",
    );
    expect(searchEntries(entries, "trip")[0]?.snippet).toBeUndefined();
  });

  test("cuts a long content down to the part around the match", () => {
    const long = `${"word ".repeat(40)}needle ${"more ".repeat(40)}`;
    const [result] = searchEntries([entry("Long", long)], "needle");

    expect(result?.snippet?.startsWith("…")).toBe(true);
    expect(result?.snippet?.endsWith("…")).toBe(true);
    expect(result?.snippet).toContain("needle");
    expect(result?.snippet?.length).toBeLessThan(100);
  });

  test("keeps to the limit", () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      entry(`Note ${index}`),
    );

    expect(searchEntries(many, "note")).toHaveLength(12);
    expect(searchEntries(many, "note", 5)).toHaveLength(5);
  });
});

test("buildSearchEntries describes each kind of thing", () => {
  const entries = buildSearchEntries(
    {
      documents: [
        {
          id: "d1",
          title: "",
          type: "text",
          favorite: false,
          folderId: "f1",
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: "2026-11-01T00:00:00.000Z",
        },
      ],
      texts: [{ id: "d1", text: "Hello" }],
      folders: [{ id: "f1", name: "University" }],
      tasks: [
        {
          ...EMPTY_TASK_DRAFT,
          id: "t1",
          title: "Essay",
          notes: "2000 words",
          dueDate: TODAY,
          projectId: "p1",
          status: "todo",
          completedAt: null,
          createdAt: "2026-11-01T00:00:00.000Z",
        },
      ],
      projects: [{ id: "p1", name: "History", color: "amber" }],
      exams: [
        {
          id: "x1",
          subject: "Algorithms",
          date: "2026-11-17",
          time: null,
          location: "Hall A",
          notes: "",
          createdAt: "2026-11-01T00:00:00.000Z",
        },
      ],
      events: [
        {
          id: "e1",
          title: "Dentist",
          date: "2026-11-20",
          startMinute: 600,
          endMinute: 645,
          location: "",
          notes: "",
          color: "rose",
          createdAt: "2026-11-01T00:00:00.000Z",
        },
      ],
    },
    TODAY,
  );

  expect(entries).toEqual([
    {
      kind: "document",
      id: "d1",
      title: "Untitled",
      detail: "University",
      body: "Hello",
    },
    {
      kind: "task",
      id: "t1",
      title: "Essay",
      detail: "Today, History",
      body: "2000 words",
    },
    {
      kind: "exam",
      id: "x1",
      title: "Algorithms",
      detail: "Tue 17 Nov",
      body: "Hall A",
    },
    {
      kind: "event",
      id: "e1",
      title: "Dentist",
      detail: "Fri 20 Nov at 10:00",
      body: "",
      date: "2026-11-20",
    },
  ]);
});

test("matchesWords filters a label by every typed word", () => {
  expect(matchesWords("Go to Schedule", searchWords("sched go"))).toBe(true);
  expect(matchesWords("Go to Schedule", searchWords("tasks"))).toBe(false);
  expect(matchesWords("Anything", searchWords(""))).toBe(true);
});
