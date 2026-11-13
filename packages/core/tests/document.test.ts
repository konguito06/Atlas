import { createSignedInUser, deleteUser } from "@atlas/db/testing";
import { expect, test } from "vitest";
import { createEmptyDocument, parseDocument } from "../src";

test("a document created without content holds the empty document", async () => {
  const person = await createSignedInUser();
  const workspaces = await person.client.from("workspaces").select("id");

  const { data, error } = await person.client
    .from("documents")
    .insert({ workspace_id: workspaces.data?.[0]?.id })
    .select("content")
    .single();
  await deleteUser(person);

  expect(error).toBeNull();
  expect(parseDocument(data?.content)).toEqual({
    ok: true,
    document: createEmptyDocument(),
  });
});
