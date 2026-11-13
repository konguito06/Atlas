import {
  minutesToTime,
  TIMETABLE_NAME_MAX_LENGTH,
  type TimetableSettings,
  validateTimetable,
  WEEKDAYS,
  type Weekday,
  weekdayName,
} from "@atlas/core";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface SettingsDialogProps {
  mode: "create" | "edit";
  initial: TimetableSettings;
  pending: boolean;
  /** A save or delete that failed, to show inside the dialog. */
  saveError?: string;
  onSubmit: (settings: TimetableSettings) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

/** Name a timetable and choose its days and hours. Mount it to open it. */
export function SettingsDialog({
  mode,
  initial,
  pending,
  saveError,
  onSubmit,
  onDelete,
  onClose,
}: SettingsDialogProps) {
  const nameId = useId();
  const startId = useId();
  const endId = useId();
  const [name, setName] = useState(initial.name);
  const [days, setDays] = useState<Weekday[]>(initial.days);
  const [startHour, setStartHour] = useState(initial.startHour);
  const [endHour, setEndHour] = useState(initial.endHour);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string>();

  function toggleDay(day: Weekday) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((other) => other !== day)
        : [...current, day],
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateTimetable({ name, days, startHour, endHour });
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
              {mode === "create" ? "New timetable" : "Customise timetable"}
            </DialogTitle>
            <DialogDescription>
              Choose which days and hours the grid shows.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              value={name}
              maxLength={TIMETABLE_NAME_MAX_LENGTH}
              placeholder="Semester 1"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Days</legend>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {WEEKDAYS.map((day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="size-4 accent-primary"
                  />
                  {weekdayName(day, "short")}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={startId}>First hour</Label>
              <NativeSelect
                id={startId}
                value={startHour}
                onChange={(event) => setStartHour(Number(event.target.value))}
              >
                {HOURS.slice(0, 24).map((hour) => (
                  <option key={hour} value={hour}>
                    {minutesToTime(hour * 60)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={endId}>Last hour</Label>
              <NativeSelect
                id={endId}
                value={endHour}
                onChange={(event) => setEndHour(Number(event.target.value))}
              >
                {HOURS.slice(1).map((hour) => (
                  <option key={hour} value={hour}>
                    {minutesToTime(hour * 60)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          {confirmingDelete ? (
            <DialogFooter>
              <p className="text-sm text-muted-foreground sm:mr-auto">
                Delete this timetable and all its entries?
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                Keep it
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={onDelete}
              >
                Delete timetable
              </Button>
            </DialogFooter>
          ) : (
            <DialogFooter>
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground sm:mr-auto"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {mode === "create" ? "Create timetable" : "Save"}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
