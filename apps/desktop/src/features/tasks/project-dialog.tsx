import {
  PROJECT_COLORS,
  PROJECT_NAME_MAX_LENGTH,
  type ProjectColor,
  type ProjectDraft,
  validateProject,
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
import { ENTRY_COLORS } from "@/features/timetable/entry-colors";
import { cn } from "@/lib/utils";

interface ProjectDialogProps {
  mode: "create" | "edit";
  initial: ProjectDraft;
  pending: boolean;
  /** A save or delete that failed, to show inside the dialog. */
  saveError?: string;
  onSubmit: (draft: ProjectDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Name a project and pick its colour. Mount it to open it. */
export function ProjectDialog({
  mode,
  initial,
  pending,
  saveError,
  onSubmit,
  onDelete,
  onClose,
}: ProjectDialogProps) {
  const nameId = useId();
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState<ProjectColor>(initial.color);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateProject({ name, color });
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
              {mode === "create" ? "New project" : "Edit project"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              value={name}
              maxLength={PROJECT_NAME_MAX_LENGTH}
              placeholder="History seminar"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <fieldset className="grid gap-1.5">
            <legend className="text-sm font-medium">Colour</legend>
            <div className="mt-1.5 flex gap-2">
              {PROJECT_COLORS.map((option) => (
                <input
                  key={option}
                  type="radio"
                  name="project-color"
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

          {confirmingDelete ? (
            <DialogFooter>
              <p className="text-sm text-muted-foreground sm:mr-auto">
                Delete this project? Its tasks are kept.
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
                Delete project
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
                {mode === "create" ? "Create project" : "Save"}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
