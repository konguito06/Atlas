import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarEvent, CalendarEventDraft, EventsData } from "./events";

const eventsKey = (workspaceId: string) => ["events", workspaceId] as const;

export function useEvents(data: EventsData, workspaceId: string) {
  return useQuery({
    queryKey: eventsKey(workspaceId),
    queryFn: () => data.listEvents(workspaceId),
  });
}

export function useCreateEvent(data: EventsData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & CalendarEventDraft) =>
      data.createEvent({ ...input, workspaceId }),
    onSuccess: (created) => {
      queryClient.setQueryData<CalendarEvent[]>(
        eventsKey(workspaceId),
        (events = []) => [...events, created],
      );
    },
  });
}

export function useUpdateEvent(data: EventsData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...draft }: { id: string } & CalendarEventDraft) =>
      data.updateEvent(id, draft),
    onSuccess: (saved) => {
      queryClient.setQueryData<CalendarEvent[]>(
        eventsKey(workspaceId),
        (events = []) =>
          events.map((event) => (event.id === saved.id ? saved : event)),
      );
    },
  });
}

export function useDeleteEvent(data: EventsData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteEvent(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<CalendarEvent[]>(
        eventsKey(workspaceId),
        (events = []) => events.filter((event) => event.id !== id),
      );
    },
  });
}
