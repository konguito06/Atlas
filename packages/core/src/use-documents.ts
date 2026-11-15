import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AtlasData, DocumentSummary } from "./data";
import type { AtlasDocument } from "./document";
import type { Folder } from "./library";

const workspacesKey = ["workspaces"] as const;
const documentsKey = (workspaceId: string) =>
  ["documents", workspaceId] as const;
const foldersKey = (workspaceId: string) => ["folders", workspaceId] as const;
const contentKey = (documentId: string) =>
  ["document-content", documentId] as const;

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
    mutationFn: (input: string | { id: string; folderId: string | null }) =>
      data.createDocument(
        typeof input === "string"
          ? { id: input, workspaceId }
          : { ...input, workspaceId },
      ),
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

/** A document's stored content, read fresh each time it is opened. */
export function useDocumentContent(data: AtlasData, documentId: string) {
  return useQuery({
    queryKey: contentKey(documentId),
    queryFn: () => data.getDocumentContent(documentId),
    // The editor holds the content from here on; a background refetch
    // would only race with what is being typed.
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });
}

export function useSaveDocumentContent(data: AtlasData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: AtlasDocument }) =>
      data.saveDocumentContent(id, content),
    onSuccess: (saved) => {
      // Keeps "last edited" current in the list.
      queryClient.setQueryData<DocumentSummary[]>(
        documentsKey(workspaceId),
        (documents = []) =>
          documents.map((document) =>
            document.id === saved.id ? saved : document,
          ),
      );
    },
  });
}

/** Marks a document as a favourite, or files it in a folder. */
export function useOrganizeDocument(data: AtlasData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...change
    }: {
      id: string;
      favorite?: boolean;
      folderId?: string | null;
    }) => data.organizeDocument(id, change),
    onSuccess: (saved) => {
      queryClient.setQueryData<DocumentSummary[]>(
        documentsKey(workspaceId),
        (documents = []) =>
          documents.map((document) =>
            document.id === saved.id ? saved : document,
          ),
      );
    },
  });
}

export function useFolders(data: AtlasData, workspaceId: string) {
  return useQuery({
    queryKey: foldersKey(workspaceId),
    queryFn: () => data.listFolders(workspaceId),
  });
}

export function useCreateFolder(data: AtlasData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      data.createFolder({ ...input, workspaceId }),
    onSuccess: (created) => {
      queryClient.setQueryData<Folder[]>(
        foldersKey(workspaceId),
        (folders = []) => [...folders, created],
      );
    },
  });
}

export function useRenameFolder(data: AtlasData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      data.renameFolder(id, name),
    onSuccess: (saved) => {
      queryClient.setQueryData<Folder[]>(
        foldersKey(workspaceId),
        (folders = []) =>
          folders.map((folder) => (folder.id === saved.id ? saved : folder)),
      );
    },
  });
}

export function useDeleteFolder(data: AtlasData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteFolder(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Folder[]>(
        foldersKey(workspaceId),
        (folders = []) => folders.filter((folder) => folder.id !== id),
      );
      // Its documents are kept, outside any folder.
      queryClient.setQueryData<DocumentSummary[]>(
        documentsKey(workspaceId),
        (documents = []) =>
          documents.map((document) =>
            document.folderId === id
              ? { ...document, folderId: null }
              : document,
          ),
      );
    },
  });
}
