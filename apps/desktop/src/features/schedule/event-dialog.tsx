import {
  type AtlasData,
  type CalendarEvent,
  EVENT_LOCATION_MAX_LENGTH,
  EVENT_NOTES_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  minutesToTime,
  TIMETABLE_COLORS,
  type TimetableColor,
  timeToMinutes,
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
  validateEvent,
} from "@atlas/core";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ENTRY_COLORS } from "@/features/timetable/entry-colors";
import { cn } from "@/lib/utils";

/** Where a new event starts out: the date and hour that were clicked. */
export interface EventStart {
  date: string;
  startMinute: number;
}

interface EventDialogProps {
  data: AtlasData;
  workspaceId: string;
  /** The event to edit; leave out, and pass `start`, to add a new one. */
  event?: CalendarEvent;
  start?: EventStart;
  onClose: () => void;
}

/** One event: add it, change it or delete it. Mount it to open it. */
export function EventDialog({
  data,
  workspaceId,
  event,
  start,
  onClose,
}: EventDialogProps) {
  const ids = {
    title: useId(),
    date: useId(),
    allDay: useId(),
    starts: useId(),
    ends: useId(),
    location: useId(),
    notes: useId(),
  };
  const create = useCreateEvent(data, workspaceId);
  const update = useUpdateEvent(data, workspaceId);
  const remove = useDeleteEvent(data, workspaceId);
  const firstMinute = event?.startMinute ?? start?.startMinute ?? 9 * 60;
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? start?.date ?? "");
  const [allDay, setAllDay] = useState(
    event !== undefined && event.startMinute === null,
  );
  const [starts, setStarts] = useState(minutesToTime(firstMinute));
  const [ends, setEnds] = useState(
    minutesToTime(event?.endMinute ?? Math.min(firstMinute + 60, 1440 - 1)),
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [color, setColor] = useState<TimetableColor>(event?.color ?? "blue");
  const [error, setError] = useState<string>();

  const pending = create.isPending || update.isPending || remove.isPending;
  const message =
    error ?? (create.error ?? update.error ?? remove.error)?.message;

  function handleSubmit(submitted: FormEvent) {
    submitted.preventDefault();
    const result = validateEvent({
      title,
      date,
      startMinute: allDay ? null : timeToMinutes(starts),
      endMinute: allDay ? null : timeToMinutes(ends),
      location,
      notes,
      color,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(undefined);
    if (event) {
      update.mutate({ id: event.id, ...result.value }, { onSuccess: onClose });
    } else {
      create.mutate(
        { id: crypto.randomUUID(), ...result.value },
        { onSuccess: onClose },
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{event ? "Event" : "Add event"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={ids.title}>Title</Label>
            <Input
              id={ids.title}
              value={title}
              maxLength={EVENT_TITLE_MAX_LENGTH}
              placeholder="Study session"
              onChange={(changed) => setTitle(changed.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={ids.date}>Date</Label>
              <Input
                id={ids.date}
                type="date"
                value={date}
                onChange={(changed) => setDate(changed.target.value)}
              />
            </div>
            <div className="flex h-8 items-center gap-2">
              <input
                id={ids.allDay}
                type="checkbox"
                checked={allDay}
                onChange={(changed) => setAllDay(changed.target.checked)}
                className="atlas-check"
              />
              <Label htmlFor={ids.allDay}>All day</Label>
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={ids.starts}>Starts</Label>
                <Input
                  id={ids.starts}
                  type="time"
                  value={starts}
                  onChange={(changed) => setStarts(changed.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={ids.ends}>Ends</Label>
                <Input
                  id={ids.ends}
                  type="time"
                  value={ends}
                  onChange={(changed) => setEnds(changed.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor={ids.location}>Location (optional)</Label>
            <Input
              id={ids.location}
              value={location}
              maxLength={EVENT_LOCATION_MAX_LENGTH}
              onChange={(changed) => setLocation(changed.target.value)}
            />
          </div>

          <fieldset className="grid gap-1.5">
            <legend className="text-sm font-medium">Colour</legend>
            <div className="mt-1.5 flex gap-2">
              {TIMETABLE_COLORS.map((option) => (
                <input
                  key={option}
                  type="radio"
                  name="event-color"
                  value={option}
                  checked={color === option}
                  aria-label={ENTRY_COLORS[option].name}
                  onChange={() => setColor(option)}
                  className={cn(
                    "size-6 appearance-none rounded-full outline-none ring-offset-2 ring-offset-popover checked:ring-2 checked:ring-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    ENTRY_COLORS[option].swatch,
                  )}
                />
              ))}
            </div>
          </fieldset>

          <div className="grid gap-1.5">
            <Label htmlFor={ids.notes}>Notes (optional)</Label>
            <Textarea
              id={ids.notes}
              value={notes}
              maxLength={EVENT_NOTES_MAX_LENGTH}
              onChange={(changed) => setNotes(changed.target.value)}
            />
          </div>

          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <DialogFooter>
            {event && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                disabled={pending}
                onClick={() => remove.mutate(event.id, { onSuccess: onClose })}
              >
                Delete event
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {event ? "Save" : "Add event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
