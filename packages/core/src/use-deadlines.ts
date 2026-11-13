import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Deadline, DeadlineDraft, DeadlinesData } from "./deadlines";

const deadlinesKey = (workspaceId: string) =>
  ["deadlines", workspaceId] as const;

export function useDeadlines(data: DeadlinesData, workspaceId: string) {
  return useQuery({
    queryKey: deadlinesKey(workspaceId),
    queryFn: () => data.listDeadlines(workspaceId),
  });
}

export function useCreateDeadline(data: DeadlinesData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & DeadlineDraft) =>
      data.createDeadline({ ...input, workspaceId }),
    onSuccess: (created) => {
      queryClient.setQueryData<Deadline[]>(
        deadlinesKey(workspaceId),
        (deadlines = []) => [...deadlines, created],
      );
    },
  });
}

export function useUpdateDeadline(data: DeadlinesData, workspaceId: string) {
  const queryClient = useQueryClient();
  const key = deadlinesKey(workspaceId);

  function replace(id: string, change: Partial<Deadline>) {
    queryClient.setQueryData<Deadline[]>(key, (deadlines = []) =>
      deadlines.map((deadline) =>
        deadline.id === id ? { ...deadline, ...change } : deadline,
      ),
    );
  }

  return useMutation({
    mutationFn: ({
      id,
      ...change
    }: { id: string } & Partial<DeadlineDraft & { completed: boolean }>) =>
      data.updateDeadline(id, change),
    // Show the change at once (ticking a box should feel instant); put the
    // old values back if saving fails.
    onMutate: async ({ id, ...change }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient
        .getQueryData<Deadline[]>(key)
        ?.find((deadline) => deadline.id === id);
      replace(id, change);
      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) replace(id, context.previous);
    },
    onSuccess: (saved) => replace(saved.id, saved),
  });
}

export function useDeleteDeadline(data: DeadlinesData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteDeadline(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Deadline[]>(
        deadlinesKey(workspaceId),
        (deadlines = []) => deadlines.filter((deadline) => deadline.id !== id),
      );
    },
  });
}
