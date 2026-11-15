import {
  type AtlasData,
  FOLDER_NAME_MAX_LENGTH,
  type Folder,
  useCreateFolder,
  useDeleteFolder,
  useRenameFolder,
  validateFolderName,
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

interface FolderDialogProps {
  data: AtlasData;
  workspaceId: string;
  /** The folder to rename or delete; leave out to create one. */
  folder?: Folder;
  onClose: () => void;
  onCreated?: (folder: Folder) => void;
  onDeleted?: () => void;
}

/** Creates a folder, or renames or deletes one. Mount it to open it. */
export function FolderDialog({
  data,
  workspaceId,
  folder,
  onClose,
  onCreated,
  onDeleted,
}: FolderDialogProps) {
  const nameId = useId();
  const create = useCreateFolder(data, workspaceId);
  const rename = useRenameFolder(data, workspaceId);
  const remove = useDeleteFolder(data, workspaceId);
  const [name, setName] = useState(folder?.name ?? "");
  const [error, setError] = useState<string>();
  const pending = create.isPending || rename.isPending || remove.isPending;
  const message =
    error ?? (create.error ?? rename.error ?? remove.error)?.message;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateFolderName(name);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(undefined);
    if (folder) {
      rename.mutate(
        { id: folder.id, name: result.value },
        { onSuccess: onClose },
      );
    } else {
      create.mutate(
        { id: crypto.randomUUID(), name: result.value },
        {
          onSuccess: (created) => {
            onCreated?.(created);
            onClose();
          },
        },
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{folder ? "Folder" : "New folder"}</DialogTitle>
            {folder && (
              <DialogDescription>
                Deleting a folder keeps its documents.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              value={name}
              maxLength={FOLDER_NAME_MAX_LENGTH}
              placeholder="University"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <DialogFooter>
            {folder && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                disabled={pending}
                onClick={() =>
                  remove.mutate(folder.id, {
                    onSuccess: () => {
                      onDeleted?.();
                      onClose();
                    },
                  })
                }
              >
                Delete folder
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {folder ? "Save" : "Create folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
