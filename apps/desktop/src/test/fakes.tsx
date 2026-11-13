import type { AtlasClient, AtlasData, DocumentSummary } from "@atlas/core";
import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { App } from "../App";

export const VALID_CODE = "481902";

type FakeSession = { user: { email: string } } | null;
type SessionListener = (event: string, session: FakeSession) => void;

/** Stands in for Supabase auth: holds one session and accepts one code. */
export function createFakeClient({ signedInAs }: { signedInAs?: string } = {}) {
  let listener: SessionListener = () => {};

  const auth = {
    onAuthStateChange: vi.fn((callback: SessionListener) => {
      listener = callback;
      queueMicrotask(() =>
        callback(
          "INITIAL_SESSION",
          signedInAs ? { user: { email: signedInAs } } : null,
        ),
      );
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signInWithOtp: vi.fn(async (_request: { email: string }) => ({
      error: null,
    })),
    verifyOtp: vi.fn(async (request: { email: string; token: string }) => {
      if (request.token !== VALID_CODE) {
        return { error: { code: "otp_expired", status: 403 } };
      }
      listener("SIGNED_IN", { user: { email: request.email } });
      return { error: null };
    }),
    signOut: vi.fn(async () => {
      listener("SIGNED_OUT", null);
      return { error: null };
    }),
  };

  return { client: { auth } as unknown as AtlasClient, auth };
}

export function documentNamed(title: string, id = title): DocumentSummary {
  return {
    id,
    title,
    createdAt: "2026-11-13T10:00:00.000Z",
    updatedAt: "2026-11-13T10:00:00.000Z",
  };
}

/** Keeps documents in memory. `failing` makes the named operations reject. */
export function createFakeData(
  initial: DocumentSummary[] = [],
  failing: Array<"list" | "rename"> = [],
): AtlasData {
  let documents = [...initial];

  return {
    listWorkspaces: async () => [{ id: "workspace-1", name: "Personal" }],
    listDocuments: async () => {
      if (failing.includes("list")) {
        throw new Error("Could not load your documents.");
      }
      return documents;
    },
    createDocument: async ({ id }) => {
      const created = documentNamed("", id);
      documents = [created, ...documents];
      return created;
    },
    renameDocument: async (id, title) => {
      if (failing.includes("rename")) {
        throw new Error("Could not rename the document.");
      }
      const renamed = { ...documentNamed(title, id) };
      documents = documents.map((document) =>
        document.id === id ? renamed : document,
      );
      return renamed;
    },
    deleteDocument: async (id) => {
      documents = documents.filter((document) => document.id !== id);
    },
  };
}

/** Renders the whole app for someone who is already signed in. */
export function renderSignedIn(data: AtlasData) {
  const { client, auth } = createFakeClient({ signedInAs: "ana@example.com" });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<App client={client} data={data} queryClient={queryClient} />);
  return { auth };
}
