import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  admin,
  createAnonymousClient,
  createSignedInUser,
  deleteUser,
  type TestUser,
} from "./local-supabase";

// Postgres error codes the API passes through.
const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";

let owner: TestUser;
let member: TestUser;
let outsider: TestUser;
let workspaceId: string;
let documentId: string;
const createdWorkspaceIds: string[] = [];

async function createWorkspace(user: TestUser, name: string): Promise<string> {
  const { data, error } = await user.client.rpc("create_workspace", { name });
  if (error) throw error;
  createdWorkspaceIds.push(data.id);
  return data.id;
}

// Reads through the admin client, so the result is the real stored state
// and not what Row Level Security lets a user see.
async function storedTitle(id: string): Promise<string | undefined> {
  const { data, error } = await admin
    .from("documents")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data?.title;
}

async function storedWorkspaceName(id: string): Promise<string | undefined> {
  const { data, error } = await admin
    .from("workspaces")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data?.name;
}

beforeAll(async () => {
  [owner, member, outsider] = await Promise.all([
    createSignedInUser(),
    createSignedInUser(),
    createSignedInUser(),
  ]);

  workspaceId = await createWorkspace(owner, "Owner workspace");

  const membership = await admin
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: member.id, role: "member" });
  if (membership.error) throw membership.error;

  const document = await owner.client
    .from("documents")
    .insert({ workspace_id: workspaceId, title: "Roadmap" })
    .select()
    .single();
  if (document.error) throw document.error;
  documentId = document.data.id;
});

afterAll(async () => {
  await admin.from("workspaces").delete().in("id", createdWorkspaceIds);
  await Promise.all([owner, member, outsider].map(deleteUser));
});

describe("a new person", () => {
  let person: TestUser;
  let personalWorkspaceId: string;

  test("starts with a personal workspace they own", async () => {
    person = await createSignedInUser();

    const workspaces = await person.client
      .from("workspaces")
      .select("id, name");
    const memberships = await person.client
      .from("workspace_members")
      .select("user_id, role");

    expect(workspaces.data).toHaveLength(1);
    expect(workspaces.data?.[0]?.name).toBe("Personal");
    expect(memberships.data).toEqual([{ user_id: person.id, role: "owner" }]);
    personalWorkspaceId = workspaces.data?.[0]?.id;
  });

  test("takes that workspace with them when the account is deleted", async () => {
    expect(await storedWorkspaceName(personalWorkspaceId)).toBe("Personal");

    await deleteUser(person);

    expect(await storedWorkspaceName(personalWorkspaceId)).toBeUndefined();
  });
});

describe("the owner of a workspace", () => {
  test("is recorded as its owner when creating it", async () => {
    const { data, error } = await owner.client
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", owner.id);

    expect(error).toBeNull();
    expect(data).toEqual([{ user_id: owner.id, role: "owner" }]);
  });

  test("is recorded as the author of documents they create", async () => {
    const { data } = await owner.client
      .from("documents")
      .select("created_by")
      .eq("id", documentId)
      .single();

    expect(data?.created_by).toBe(owner.id);
  });

  test("can rename the workspace", async () => {
    const { data, error } = await owner.client
      .from("workspaces")
      .update({ name: "Renamed workspace" })
      .eq("id", workspaceId)
      .select("name");

    expect(error).toBeNull();
    expect(data).toEqual([{ name: "Renamed workspace" }]);
  });

  test("can create a document with an id chosen on the device", async () => {
    const id = randomUUID();
    const { data, error } = await owner.client
      .from("documents")
      .insert({ id, workspace_id: workspaceId, title: "Written offline" })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(id);
  });
});

describe("a member who is not the owner", () => {
  test("can read and rename documents", async () => {
    const { data, error } = await member.client
      .from("documents")
      .update({ title: "Roadmap v2" })
      .eq("id", documentId)
      .select("title, created_at, updated_at")
      .single();

    expect(error).toBeNull();
    expect(data?.title).toBe("Roadmap v2");
    expect(Date.parse(data?.updated_at)).toBeGreaterThan(
      Date.parse(data?.created_at),
    );
  });

  test("can save document content", async () => {
    const content = {
      version: 1,
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
      ],
    };

    const { data, error } = await member.client
      .from("documents")
      .update({ content })
      .eq("id", documentId)
      .select("content")
      .single();

    expect(error).toBeNull();
    expect(data?.content).toEqual(content);
  });

  test("cannot rename the workspace", async () => {
    const before = await storedWorkspaceName(workspaceId);
    const { data } = await member.client
      .from("workspaces")
      .update({ name: "Taken over" })
      .eq("id", workspaceId)
      .select();

    expect(data).toEqual([]);
    expect(await storedWorkspaceName(workspaceId)).toBe(before);
  });

  test("cannot delete the workspace", async () => {
    const { data } = await member.client
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)
      .select();

    expect(data).toEqual([]);
    expect(await storedWorkspaceName(workspaceId)).toBeDefined();
  });

  test("cannot promote themselves to owner", async () => {
    const { error } = await member.client
      .from("workspace_members")
      .update({ role: "owner" })
      .eq("workspace_id", workspaceId)
      .eq("user_id", member.id);

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe("a user outside the workspace", () => {
  test("cannot see the workspace, its members or its documents", async () => {
    const workspaces = await outsider.client
      .from("workspaces")
      .select()
      .eq("id", workspaceId);
    const members = await outsider.client
      .from("workspace_members")
      .select()
      .eq("workspace_id", workspaceId);
    const documents = await outsider.client
      .from("documents")
      .select()
      .eq("workspace_id", workspaceId);

    expect(workspaces.data).toEqual([]);
    expect(members.data).toEqual([]);
    expect(documents.data).toEqual([]);
  });

  test("sees only their own workspaces when listing everything", async () => {
    const workspaces = await outsider.client.from("workspaces").select("id");
    const documents = await outsider.client.from("documents").select();

    expect(workspaces.data?.map((workspace) => workspace.id)).not.toContain(
      workspaceId,
    );
    expect(documents.data).toEqual([]);
  });

  test("cannot create a document in it", async () => {
    const { error } = await outsider.client
      .from("documents")
      .insert({ workspace_id: workspaceId, title: "Intruder" });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  test("cannot rename or delete its documents", async () => {
    const before = await storedTitle(documentId);

    const renamed = await outsider.client
      .from("documents")
      .update({ title: "Defaced" })
      .eq("id", documentId)
      .select();
    const deleted = await outsider.client
      .from("documents")
      .delete()
      .eq("id", documentId)
      .select();

    expect(renamed.data).toEqual([]);
    expect(deleted.data).toEqual([]);
    expect(await storedTitle(documentId)).toBe(before);
  });

  test("cannot rename or delete the workspace", async () => {
    const before = await storedWorkspaceName(workspaceId);

    const renamed = await outsider.client
      .from("workspaces")
      .update({ name: "Taken over" })
      .eq("id", workspaceId)
      .select();
    const deleted = await outsider.client
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)
      .select();

    expect(renamed.data).toEqual([]);
    expect(deleted.data).toEqual([]);
    expect(await storedWorkspaceName(workspaceId)).toBe(before);
  });

  test("cannot add themselves as a member", async () => {
    const { error } = await outsider.client
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: outsider.id });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  test("keeps their own workspace private from others", async () => {
    const ownWorkspaceId = await createWorkspace(outsider, "Outsider space");

    const { data } = await owner.client
      .from("workspaces")
      .select()
      .eq("id", ownWorkspaceId);

    expect(data).toEqual([]);
  });
});

describe("a signed-out visitor", () => {
  const visitor = createAnonymousClient();

  test.each(["workspaces", "workspace_members", "documents"])(
    "cannot read %s",
    async (table) => {
      const { data, error } = await visitor.from(table).select();

      expect(data).toBeNull();
      expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    },
  );

  test("cannot create a workspace", async () => {
    const { data, error } = await visitor.rpc("create_workspace", {
      name: "Anonymous",
    });

    expect(data).toBeNull();
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe("integrity rules that apply even to members", () => {
  test("a workspace cannot be inserted directly, bypassing create_workspace", async () => {
    const { error } = await owner.client
      .from("workspaces")
      .insert({ name: "Side door" });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  test("a document cannot be attributed to someone else", async () => {
    const { error } = await owner.client.from("documents").insert({
      workspace_id: workspaceId,
      title: "Forged",
      created_by: member.id,
    });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  test("a document cannot be moved to another workspace", async () => {
    const otherWorkspaceId = await createWorkspace(owner, "Second workspace");

    const { error } = await owner.client
      .from("documents")
      .update({ workspace_id: otherWorkspaceId })
      .eq("id", documentId);

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  test("document content cannot be a string of HTML", async () => {
    const { error } = await owner.client
      .from("documents")
      .update({ content: "<p>Hello</p>" })
      .eq("id", documentId);

    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  test("a workspace name cannot be blank", async () => {
    const { error } = await owner.client.rpc("create_workspace", {
      name: "   ",
    });

    expect(error?.code).toBe(CHECK_VIOLATION);
  });
});
