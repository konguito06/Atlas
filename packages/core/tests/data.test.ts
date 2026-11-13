import { randomUUID } from "node:crypto";
import {
  createSignedInUser,
  deleteUser,
  type TestUser,
} from "@atlas/db/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { type AtlasData, createAtlasData } from "../src";

let person: TestUser;
let stranger: TestUser;
let data: AtlasData;
let workspaceId: string;

beforeAll(async () => {
  [person, stranger] = await Promise.all([
    createSignedInUser(),
    createSignedInUser(),
  ]);
  data = createAtlasData(person.client);
});

afterAll(async () => {
  await Promise.all([person, stranger].map(deleteUser));
});

describe("reading and writing through the data layer", () => {
  test("a new person has one workspace, called Personal", async () => {
    const workspaces = await data.listWorkspaces();

    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]?.name).toBe("Personal");
    workspaceId = workspaces[0]?.id ?? "";
  });

  test("documents are created with the given id and listed newest first", async () => {
    const firstId = randomUUID();
    const secondId = randomUUID();

    const first = await data.createDocument({ id: firstId, workspaceId });
    await data.createDocument({ id: secondId, workspaceId });
    const documents = await data.listDocuments(workspaceId);

    expect(first).toMatchObject({ id: firstId, title: "" });
    expect(documents.map((document) => document.id)).toEqual([
      secondId,
      firstId,
    ]);
  });

  test("a document can be renamed", async () => {
    const [document] = await data.listDocuments(workspaceId);
    if (!document) throw new Error("expected a document");

    const renamed = await data.renameDocument(document.id, "Trip plan");
    const documents = await data.listDocuments(workspaceId);

    expect(renamed.title).toBe("Trip plan");
    expect(documents[0]?.title).toBe("Trip plan");
  });

  test("a title longer than the limit is refused with a readable message", async () => {
    const [document] = await data.listDocuments(workspaceId);
    if (!document) throw new Error("expected a document");

    await expect(
      data.renameDocument(document.id, "x".repeat(301)),
    ).rejects.toThrow("Could not rename the document.");
  });

  test("a document can be deleted", async () => {
    const before = await data.listDocuments(workspaceId);
    const target = before[0];
    if (!target) throw new Error("expected a document");

    await data.deleteDocument(target.id);
    const after = await data.listDocuments(workspaceId);

    expect(after.map((document) => document.id)).not.toContain(target.id);
    expect(after).toHaveLength(before.length - 1);
  });

  test("someone else sees none of it and cannot add to it", async () => {
    const strangerData = createAtlasData(stranger.client);

    expect(await strangerData.listDocuments(workspaceId)).toEqual([]);
    await expect(
      strangerData.createDocument({ id: randomUUID(), workspaceId }),
    ).rejects.toThrow("Could not create the document.");
  });
});
