import { useEffect, useState } from "react";
import type { AtlasClient } from "./supabase";

export type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; email: string };

/** Follows the client's session, including the one restored at startup. */
export function useSession(client: AtlasClient): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    // Fires once immediately with the stored session, then on every change.
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: "signed-in", email: session.user.email ?? "" }
          : { status: "signed-out" },
      );
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  return state;
}
