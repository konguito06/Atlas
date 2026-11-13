import {
  type AtlasClient,
  type AtlasData,
  createAtlasData,
  useSession,
} from "@atlas/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { SignInScreen } from "@/features/auth/sign-in-screen";
import { WorkspaceScreen } from "@/features/workspace/workspace-screen";

interface AppProps {
  client: AtlasClient;
  /** Tests pass in-memory versions of these two. */
  data?: AtlasData;
  queryClient?: QueryClient;
}

export function App({ client, data, queryClient }: AppProps) {
  const session = useSession(client);
  const [ownQueryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }),
  );
  const activeQueryClient = queryClient ?? ownQueryClient;
  const atlasData = useMemo(
    () => data ?? createAtlasData(client),
    [data, client],
  );

  // Someone else may sign in next, so cached data must not outlive a session.
  useEffect(() => {
    if (session.status === "signed-out") {
      activeQueryClient.clear();
    }
  }, [session.status, activeQueryClient]);

  // Render nothing while the stored session is read, to avoid flashing the
  // sign-in form at someone who is already signed in.
  if (session.status === "loading") {
    return null;
  }
  if (session.status === "signed-out") {
    return <SignInScreen client={client} />;
  }
  return (
    <QueryClientProvider client={activeQueryClient}>
      <WorkspaceScreen client={client} data={atlasData} email={session.email} />
    </QueryClientProvider>
  );
}
