import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Timetable,
  TimetableEntry,
  TimetableEntryDraft,
  TimetableSettings,
  TimetablesData,
} from "./timetables";

const timetablesKey = (workspaceId: string) =>
  ["timetables", workspaceId] as const;
const entriesKey = (timetableId: string) =>
  ["timetable-entries", timetableId] as const;

export function useTimetables(data: TimetablesData, workspaceId: string) {
  return useQuery({
    queryKey: timetablesKey(workspaceId),
    queryFn: () => data.listTimetables(workspaceId),
  });
}

export function useCreateTimetable(data: TimetablesData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & TimetableSettings) =>
      data.createTimetable({ ...input, workspaceId }),
    onSuccess: (created) => {
      queryClient.setQueryData<Timetable[]>(
        timetablesKey(workspaceId),
        (timetables = []) => [...timetables, created],
      );
    },
  });
}

export function useUpdateTimetable(data: TimetablesData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...settings }: { id: string } & TimetableSettings) =>
      data.updateTimetable(id, settings),
    onSuccess: (saved) => {
      queryClient.setQueryData<Timetable[]>(
        timetablesKey(workspaceId),
        (timetables = []) =>
          timetables.map((timetable) =>
            timetable.id === saved.id ? saved : timetable,
          ),
      );
    },
  });
}

export function useDeleteTimetable(data: TimetablesData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteTimetable(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Timetable[]>(
        timetablesKey(workspaceId),
        (timetables = []) =>
          timetables.filter((timetable) => timetable.id !== id),
      );
      queryClient.removeQueries({ queryKey: entriesKey(id) });
    },
  });
}

export function useTimetableEntries(data: TimetablesData, timetableId: string) {
  return useQuery({
    queryKey: entriesKey(timetableId),
    queryFn: () => data.listTimetableEntries(timetableId),
  });
}

export function useCreateTimetableEntry(
  data: TimetablesData,
  timetableId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & TimetableEntryDraft) =>
      data.createTimetableEntry({ ...input, timetableId }),
    onSuccess: (created) => {
      queryClient.setQueryData<TimetableEntry[]>(
        entriesKey(timetableId),
        (entries = []) => [...entries, created],
      );
    },
  });
}

export function useUpdateTimetableEntry(
  data: TimetablesData,
  timetableId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...draft }: { id: string } & TimetableEntryDraft) =>
      data.updateTimetableEntry(id, draft),
    onSuccess: (saved) => {
      queryClient.setQueryData<TimetableEntry[]>(
        entriesKey(timetableId),
        (entries = []) =>
          entries.map((entry) => (entry.id === saved.id ? saved : entry)),
      );
    },
  });
}

export function useDeleteTimetableEntry(
  data: TimetablesData,
  timetableId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteTimetableEntry(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<TimetableEntry[]>(
        entriesKey(timetableId),
        (entries = []) => entries.filter((entry) => entry.id !== id),
      );
    },
  });
}
