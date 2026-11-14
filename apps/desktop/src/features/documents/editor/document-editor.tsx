import {
  type AtlasDocument,
  countWords,
  documentToPlainText,
  fromEditorJson,
} from "@atlas/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EditorToolbar } from "./editor-toolbar";
import { editorExtensions } from "./extensions";

/** How long after the last keystroke the document is saved. */
const SAVE_DELAY_MS = 800;

type SaveState = "saved" | "unsaved" | "saving" | "failed";

const STATE_LABELS: Record<SaveState, string> = {
  saved: "Saved",
  unsaved: "Saving…",
  saving: "Saving…",
  failed: "Could not save",
};

interface DocumentEditorProps {
  initial: AtlasDocument;
  /** Stores the document; rejects if it could not be stored. */
  onSave: (content: AtlasDocument) => Promise<unknown>;
}

/**
 * The writing surface for one document. It saves by itself shortly after
 * typing stops, and again when it is closed with changes pending.
 */
export function DocumentEditor({ initial, onSave }: DocumentEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [words, setWords] = useState(() =>
    countWords(documentToPlainText(initial)),
  );
  // What still has to be written, and the timer that will write it.
  const pending = useRef<AtlasDocument | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useRef(onSave);
  save.current = onSave;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const content = pending.current;
    if (!content) return;
    setSaveState("saving");
    try {
      await save.current(content);
      // Only settle if nothing newer was typed while this was being saved.
      if (pending.current === content) {
        pending.current = null;
        setSaveState("saved");
      }
    } catch {
      setSaveState("failed");
    }
  }, []);

  const editor = useEditor({
    extensions: editorExtensions,
    content: initial,
    // Redraw on every change, selection included, so the toolbar always
    // shows the formatting at the cursor.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "atlas-prose",
        "aria-label": "Document content",
      },
    },
    onUpdate: ({ editor: current }) => {
      const parsed = fromEditorJson(current.getJSON());
      if (!parsed.ok) {
        // The editor only produces what the format allows, so this means
        // the two have drifted apart. Never save something unreadable.
        clearTimeout(timer.current);
        pending.current = null;
        setSaveState("failed");
        return;
      }
      pending.current = parsed.document;
      setWords(countWords(documentToPlainText(parsed.document)));
      setSaveState("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
  });

  // Closing or switching documents must not lose the last few words.
  useEffect(() => () => void flush(), [flush]);

  if (!editor) {
    return null;
  }

  return (
    <div>
      <div className="sticky top-0 z-[5] -mx-2 bg-background/90 px-2 py-2 backdrop-blur">
        <EditorToolbar editor={editor} />
      </div>

      <EditorContent editor={editor} className="mt-4" />

      <div className="mt-10 flex items-center gap-3 text-xs text-muted-foreground">
        <span role="status">{STATE_LABELS[saveState]}</span>
        {saveState === "failed" && (
          <Button variant="outline" size="sm" onClick={() => void flush()}>
            Try again
          </Button>
        )}
        <span className="ml-auto tabular-nums">
          {words} {words === 1 ? "word" : "words"}
        </span>
      </div>
    </div>
  );
}
