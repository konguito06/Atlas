import { describe, expect, test } from "vitest";
import type { DocumentSummary } from "./data";
import { findDocuments, validateFolderName } from "./library";

const doc = (
  title: string,
  updatedAt: string,
  extra: Partial<DocumentSummary> = {},
): DocumentSummary => ({
  id: title,
  title,
  type: "text",
  favorite: false,
  folderId: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt,
  ...extra,
});

const documents = [
  doc("Trip plan", "2026-11-10T10:00:00.000Z", { folderId: "travel" }),
  doc("Reading list", "2026-11-12T10:00:00.000Z", { favorite: true }),
  doc("Lisbon trip budget", "2026-11-11T10:00:00.000Z", {
    folderId: "travel",
    favorite: true,
  }),
  doc("", "2026-11-09T10:00:00.000Z"),
];
const titles = (found: DocumentSummary[]) => found.map((item) => item.title);

describe("findDocuments", () => {
  test("lists everything, most recently edited first", () => {
    expect(titles(findDocuments(documents, { kind: "all" }))).toEqual([
      "Reading list",
      "Lisbon trip budget",
      "Trip plan",
      "",
    ]);
  });

  test("narrows to favourites or to one folder", () => {
    expect(titles(findDocuments(documents, { kind: "favorites" }))).toEqual([
      "Reading list",
      "Lisbon trip budget",
    ]);
    expect(
      titles(findDocuments(documents, { kind: "folder", folderId: "travel" })),
    ).toEqual(["Lisbon trip budget", "Trip plan"]);
  });

  test("matches every word typed, in any order and any case", () => {
    expect(titles(findDocuments(documents, { kind: "all" }, "TRIP"))).toEqual([
      "Lisbon trip budget",
      "Trip plan",
    ]);
    expect(
      titles(findDocuments(documents, { kind: "all" }, " budget lisbon ")),
    ).toEqual(["Lisbon trip budget"]);
    expect(findDocuments(documents, { kind: "all" }, "trip paris")).toEqual([]);
  });

  test("searches inside the part of the library on show", () => {
    expect(
      titles(findDocuments(documents, { kind: "favorites" }, "trip")),
    ).toEqual(["Lisbon trip budget"]);
  });
});

test("a folder name is trimmed, and a blank one is refused", () => {
  expect(validateFolderName("  Travel ")).toEqual({
    ok: true,
    value: "Travel",
  });
  expect(validateFolderName("   ")).toEqual({
    ok: false,
    message: "Give the folder a name.",
  });
});
