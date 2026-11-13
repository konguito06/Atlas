import { randomUUID } from "node:crypto";
import { admin, localStack, readSignInCode } from "@atlas/db/testing";
import { afterAll, describe, expect, test } from "vitest";
import {
  createAtlasClient,
  requestSignInCode,
  signOut,
  verifySignInCode,
} from "../src";

function newClient() {
  return createAtlasClient({
    url: localStack.url,
    publishableKey: localStack.publishableKey,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const createdUserIds: string[] = [];

afterAll(async () => {
  await Promise.all(
    createdUserIds.map((id) => admin.auth.admin.deleteUser(id)),
  );
});

describe("signing in with an emailed code", () => {
  test("a new person gets a code, signs in, and can sign out", async () => {
    const client = newClient();
    const email = `${randomUUID()}@atlas.test`;

    expect(await requestSignInCode(client, email)).toEqual({ ok: true });
    const code = await readSignInCode(email);
    expect(await verifySignInCode(client, email, code)).toEqual({ ok: true });

    const { data } = await client.auth.getUser();
    expect(data.user?.email).toBe(email);
    if (data.user) createdUserIds.push(data.user.id);

    expect(await signOut(client)).toEqual({ ok: true });
    expect((await client.auth.getSession()).data.session).toBeNull();
  });

  test("a wrong code is refused and leaves the person signed out", async () => {
    const client = newClient();
    const email = `${randomUUID()}@atlas.test`;
    await requestSignInCode(client, email);
    const code = await readSignInCode(email);
    const wrongCode = code === "000000" ? "111111" : "000000";

    expect(await verifySignInCode(client, email, wrongCode)).toEqual({
      ok: false,
      message: "That code is wrong or has expired.",
    });
    expect((await client.auth.getSession()).data.session).toBeNull();

    const { data } = await admin.auth.admin.listUsers();
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) createdUserIds.push(user.id);
  });

  test("a malformed email never reaches the server", async () => {
    expect(await requestSignInCode(newClient(), "not-an-email")).toEqual({
      ok: false,
      message: "Enter a valid email address.",
    });
  });

  test("a code that is not six digits never reaches the server", async () => {
    const result = await verifySignInCode(newClient(), "a@atlas.test", "12ab");

    expect(result).toEqual({
      ok: false,
      message: "Enter the 6-digit code from the email.",
    });
  });
});
