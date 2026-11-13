import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

interface LocalStack {
  url: string;
  publishableKey: string;
  secretKey: string;
}

// Keys come from the running local stack, so none are stored in the repo.
function readLocalStack(): LocalStack {
  let output: string;
  try {
    output = execFileSync(
      "pnpm",
      ["exec", "supabase", "status", "--output", "json"],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    throw new Error(
      "Local Supabase is not running. Start it with `pnpm db:start`.",
    );
  }

  const status = JSON.parse(
    output.slice(output.indexOf("{"), output.lastIndexOf("}") + 1),
  );
  return {
    url: status.API_URL,
    publishableKey: status.PUBLISHABLE_KEY,
    secretKey: status.SECRET_KEY,
  };
}

const stack = readLocalStack();
const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

/** Bypasses Row Level Security. Used only to arrange and inspect test data. */
export const admin = createClient(stack.url, stack.secretKey, clientOptions);

/** A client with no session, like a signed-out visitor. */
export function createAnonymousClient(): SupabaseClient {
  return createClient(stack.url, stack.publishableKey, clientOptions);
}

export interface TestUser {
  id: string;
  client: SupabaseClient;
}

export async function createSignedInUser(): Promise<TestUser> {
  const email = `${randomUUID()}@atlas.test`;
  const password = randomUUID();

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;

  const client = createAnonymousClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  return { id: created.data.user.id, client };
}

export async function deleteUser(user: TestUser): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
}
