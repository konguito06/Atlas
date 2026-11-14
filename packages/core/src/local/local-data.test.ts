import { expect, test } from "vitest";
import { describeAtlasData } from "../../test-support/data-contract";
import { createMemoryDatabase } from "../../test-support/node-sqlite";
import { createEmptyDocument, parseDocument } from "../document";
import { createLocalAtlasData } from "./local-data";
import { migrate } from "./migrations";

describeAtlasData("the on-device data layer", async () => {
  const database = createMemoryDatabase();
  await migrate(database);
  return createLocalAtlasData(database);
});

test("migrating twice changes nothing and keeps the data", async () => {
  const database = createMemoryDatabase();
  await migrate(database);
  const data = createLocalAtlasData(database);
  await data.createDocument({ id: "document-1", workspaceId: "local" });

  await migrate(database);

  expect(await data.listDocuments("local")).toHaveLength(1);
});

test("a new document is stored with the empty document as its content", async () => {
  const database = createMemoryDatabase();
  await migrate(database);
  await createLocalAtlasData(database).createDocument({
    id: "document-1",
    workspaceId: "local",
  });

  const [row] = await database.select<{ content: string }>(
    "SELECT content FROM documents",
  );

  expect(parseDocument(JSON.parse(row?.content ?? "null"))).toEqual({
    ok: true,
    document: createEmptyDocument(),
  });
});
