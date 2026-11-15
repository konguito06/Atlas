import type { AssistantAccess, AtlasData } from "@atlas/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WorkspaceScreen } from "@/features/workspace/workspace-screen";

interface AppProps {
  data: AtlasData;
  /** How the assistant is reached. Leave out for an app without one. */
  assistant?: AssistantAccess;
  /** Tests pass their own, with retries off. */
  queryClient?: QueryClient;
}

export function App({ data, assistant, queryClient }: AppProps) {
  const [ownQueryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }),
  );

  return (
    <QueryClientProvider client={queryClient ?? ownQueryClient}>
      <WorkspaceScreen data={data} assistant={assistant} />
    </QueryClientProvider>
  );
}
