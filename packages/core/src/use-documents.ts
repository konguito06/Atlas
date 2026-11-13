import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AtlasData, DocumentSummary } from "./data";

const workspacesKey = ["workspaces"] as const;
const documentsKey = (workspaceId: string) =>
  ["documents", workspaceId] as const;

export function useWorkspaces(data: AtlasData) {
  return useQuery({
    queryKey: workspacesKey,
    queryFn: () => data.listWorkspaces(),
  });
}

export function useDocuments(data: AtlasData, workspaceId: string) {
  return useQuery({
    queryKey: documentsKey(workspaceId),
    queryFn: () => data.listDocuments(workspaceId),
  });
}

export function useCreateDocument(data: AtlasData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.createDocument({ id, workspaceId }),
    onSuccess: (created) => {
      queryClient.setQueryData<DocumentSummary[]>(
        documentsKey(workspaceId),
        (documents = []) => [created, ...documents],
      );
    },
  });
}

export function useRenameDocument(data: AtlasData, workspaceId: string) {
  const queryClient = useQueryClient();
  const key = documentsKey(workspaceId);

  function replace(id: string, change: Partial<DocumentSummary>) {
    queryClient.setQueryData<DocumentSummary[]>(key, (documents = []) =>
      documents.map((document) =>
        document.id === id ? { ...document, ...change } : document,
      ),
    );
  }

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      data.renameDocument(id, title),
    // Show the new title at once; put the old one back if saving fails.
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient
        .getQueryData<DocumentSummary[]>(key)
        ?.find((document) => document.id === id);
      replace(id, { title });
      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) replace(id, context.previous);
    },
    onSuccess: (renamed) => replace(renamed.id, renamed),
  });
}

export function useDeleteDocument(data: AtlasData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteDocument(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<DocumentSummary[]>(
        documentsKey(workspaceId),
        (documents = []) => documents.filter((document) => document.id !== id),
      );
    },
  });
}
