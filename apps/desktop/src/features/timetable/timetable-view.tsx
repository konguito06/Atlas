import {
  type AtlasData,
  DEFAULT_TIMETABLE_SETTINGS,
  type Timetable,
  type TimetableEntry,
  type TimetableEntryDraft,
  useCreateTimetable,
  useCreateTimetableEntry,
  useDeleteTimetable,
  useDeleteTimetableEntry,
  useTimetableEntries,
  useTimetables,
  useUpdateTimetable,
  useUpdateTimetableEntry,
  visibleEntries,
  type Weekday,
} from "@atlas/core";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { EntryDialog } from "./entry-dialog";
import { SettingsDialog } from "./settings-dialog";
import { TimetableGrid } from "./timetable-grid";

export function TimetableView({
  data,
  workspaceId,
}: {
  data: AtlasData;
  workspaceId: string;
}) {
  const pickerId = useId();
  const timetables = useTimetables(data, workspaceId);
  const create = useCreateTimetable(data, workspaceId);
  const update = useUpdateTimetable(data, workspaceId);
  const remove = useDeleteTimetable(data, workspaceId);
  const [selectedId, setSelectedId] = useState<string>();
  const [settings, setSettings] = useState<"create" | "edit">();

  // Falls back to the first timetable on load and after a delete.
  const timetable =
    timetables.data?.find((candidate) => candidate.id === selectedId) ??
    timetables.data?.[0];

  function closeSettings() {
    setSettings(undefined);
    create.reset();
    update.reset();
    remove.reset();
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-12 pt-10 pb-16">
      {timetables.isError && (
        <p role="alert" className="text-sm text-destructive">
          {timetables.error.message}
        </p>
      )}

      {timetables.isSuccess && !timetable && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <h1 className="font-heading text-2xl">No timetable yet</h1>
          <p className="text-sm text-muted-foreground">
            Create one for your week, then add your classes or shifts to it.
          </p>
          <Button onClick={() => setSettings("create")}>
            Create a timetable
          </Button>
        </div>
      )}

      {timetable && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <h1 className="mr-auto font-heading text-4xl tracking-tight">
              {timetable.name}
            </h1>
            {timetables.data && timetables.data.length > 1 && (
              <div className="flex items-center gap-2">
                <label htmlFor={pickerId} className="text-sm">
                  Timetable
                </label>
                <NativeSelect
                  id={pickerId}
                  className="w-44"
                  value={timetable.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  {timetables.data.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
            <Button variant="ghost" onClick={() => setSettings("create")}>
              New timetable
            </Button>
            <Button variant="outline" onClick={() => setSettings("edit")}>
              Customise
            </Button>
          </div>

          <TimetableBoard
            key={timetable.id}
            data={data}
            timetable={timetable}
          />
        </>
      )}

      {settings === "create" && (
        <SettingsDialog
          mode="create"
          initial={DEFAULT_TIMETABLE_SETTINGS}
          pending={create.isPending}
          saveError={create.error?.message}
          onSubmit={(value) =>
            create.mutate(
              { id: crypto.randomUUID(), ...value },
              {
                onSuccess: (created) => {
                  setSelectedId(created.id);
                  closeSettings();
                },
              },
            )
          }
          onClose={closeSettings}
        />
      )}
      {settings === "edit" && timetable && (
        <SettingsDialog
          mode="edit"
          initial={timetable}
          pending={update.isPending || remove.isPending}
          saveError={(update.error ?? remove.error)?.message}
          onSubmit={(value) =>
            update.mutate(
              { id: timetable.id, ...value },
              { onSuccess: closeSettings },
            )
          }
          onDelete={() =>
            remove.mutate(timetable.id, { onSuccess: closeSettings })
          }
          onClose={closeSettings}
        />
      )}
    </section>
  );
}

type OpenEntry =
  | { mode: "add"; initial: TimetableEntryDraft }
  | { mode: "edit"; entry: TimetableEntry };

/** One timetable's grid and the dialog for its entries. */
function TimetableBoard({
  data,
  timetable,
}: {
  data: AtlasData;
  timetable: Timetable;
}) {
  const entries = useTimetableEntries(data, timetable.id);
  const create = useCreateTimetableEntry(data, timetable.id);
  const update = useUpdateTimetableEntry(data, timetable.id);
  const remove = useDeleteTimetableEntry(data, timetable.id);
  const [open, setOpen] = useState<OpenEntry>();

  const { visible, hiddenCount } = visibleEntries(
    timetable,
    entries.data ?? [],
  );

  function close() {
    setOpen(undefined);
    create.reset();
    update.reset();
    remove.reset();
  }

  function addAt(day: Weekday, hour: number) {
    const startMinute = hour * 60;
    setOpen({
      mode: "add",
      initial: {
        title: "",
        day,
        startMinute,
        // An hour long, but never past the last minute of the day.
        endMinute: Math.min(startMinute + 60, 23 * 60 + 59),
        location: "",
        color: "blue",
      },
    });
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3">
        <Button
          onClick={() => addAt(timetable.days[0] ?? 1, timetable.startHour)}
        >
          Add entry
        </Button>
        {hiddenCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {hiddenCount === 1
              ? "1 entry is outside the days and hours shown."
              : `${hiddenCount} entries are outside the days and hours shown.`}{" "}
            Use Customise to show more.
          </p>
        )}
      </div>

      {entries.isError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {entries.error.message}
        </p>
      )}

      <TimetableGrid
        timetable={timetable}
        entries={visible}
        onAddAt={addAt}
        onOpenEntry={(entry) => setOpen({ mode: "edit", entry })}
      />

      {open?.mode === "add" && (
        <EntryDialog
          mode="add"
          initial={open.initial}
          pending={create.isPending}
          saveError={create.error?.message}
          onSubmit={(draft) =>
            create.mutate(
              { id: crypto.randomUUID(), ...draft },
              { onSuccess: close },
            )
          }
          onClose={close}
        />
      )}
      {open?.mode === "edit" && (
        <EntryDialog
          mode="edit"
          initial={open.entry}
          pending={update.isPending || remove.isPending}
          saveError={(update.error ?? remove.error)?.message}
          onSubmit={(draft) =>
            update.mutate({ id: open.entry.id, ...draft }, { onSuccess: close })
          }
          onDelete={() => remove.mutate(open.entry.id, { onSuccess: close })}
          onClose={close}
        />
      )}
    </div>
  );
}
