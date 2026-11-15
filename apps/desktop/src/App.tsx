import type { AssistantEngine, AtlasData } from "@atlas/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WorkspaceScreen } from "@/features/workspace/workspace-screen";

interface AppProps {
  data: AtlasData;
  /** What answers in the assistant. There is none yet, so the app passes nothing. */
  assistant?: AssistantEngine;
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
