import {
  ENTRY_LOCATION_MAX_LENGTH,
  ENTRY_TITLE_MAX_LENGTH,
  minutesToTime,
  TIMETABLE_COLORS,
  type TimetableColor,
  type TimetableEntryDraft,
  timeToMinutes,
  validateTimetableEntry,
  WEEKDAYS,
  type Weekday,
  weekdayName,
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
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { ENTRY_COLORS } from "./entry-colors";

interface EntryDialogProps {
  mode: "add" | "edit";
  initial: TimetableEntryDraft;
  pending: boolean;
  /** A save or delete that failed, to show inside the dialog. */
  saveError?: string;
  onSubmit: (draft: TimetableEntryDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Add or edit one block on the timetable. Mount it to open it. */
export function EntryDialog({
  mode,
  initial,
  pending,
  saveError,
  onSubmit,
  onDelete,
  onClose,
}: EntryDialogProps) {
  const titleId = useId();
  const dayId = useId();
  const startId = useId();
  const endId = useId();
  const locationId = useId();
  const [title, setTitle] = useState(initial.title);
  const [day, setDay] = useState<Weekday>(initial.day);
  const [start, setStart] = useState(minutesToTime(initial.startMinute));
  const [end, setEnd] = useState(minutesToTime(initial.endMinute));
  const [location, setLocation] = useState(initial.location);
  const [color, setColor] = useState<TimetableColor>(initial.color);
  const [error, setError] = useState<string>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const startMinute = timeToMinutes(start);
    const endMinute = timeToMinutes(end);
    if (startMinute === null || endMinute === null) {
      setError("Enter a start and an end time.");
      return;
    }
    const result = validateTimetableEntry({
      title,
      day,
      startMinute,
      endMinute,
      location,
      color,
    });
    if (result.ok) {
      setError(undefined);
      onSubmit(result.value);
    } else {
      setError(result.message);
    }
  }

  const message = error ?? saveError;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "add" ? "Add entry" : "Edit entry"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              value={title}
              maxLength={ENTRY_TITLE_MAX_LENGTH}
              placeholder="Algorithms lecture"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={dayId}>Day</Label>
              <NativeSelect
                id={dayId}
                value={day}
                onChange={(event) =>
                  setDay(Number(event.target.value) as Weekday)
                }
              >
                {WEEKDAYS.map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {weekdayName(weekday)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={startId}>Starts</Label>
              <Input
                id={startId}
                type="time"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={endId}>Ends</Label>
              <Input
                id={endId}
                type="time"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={locationId}>Location (optional)</Label>
            <Input
              id={locationId}
              value={location}
              maxLength={ENTRY_LOCATION_MAX_LENGTH}
              placeholder="Room 2.1"
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>

          <fieldset className="grid gap-1.5">
            <legend className="text-sm font-medium">Colour</legend>
            <div className="mt-1.5 flex gap-2">
              {TIMETABLE_COLORS.map((option) => (
                <input
                  key={option}
                  type="radio"
                  name="entry-color"
                  value={option}
                  checked={color === option}
                  aria-label={ENTRY_COLORS[option].name}
                  onChange={() => setColor(option)}
                  className={cn(
                    "size-6 cursor-pointer appearance-none rounded-full outline-none ring-offset-2 ring-offset-background checked:ring-2 checked:ring-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    ENTRY_COLORS[option].swatch,
                  )}
                />
              ))}
            </div>
          </fieldset>

          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <DialogFooter>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                disabled={pending}
                onClick={onDelete}
              >
                Delete entry
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {mode === "add" ? "Add entry" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
