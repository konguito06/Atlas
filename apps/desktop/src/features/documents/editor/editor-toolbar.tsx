import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  type LucideIcon,
  Minus,
  Redo2,
  SquareCode,
  Strikethrough,
  TextQuote,
  Underline,
  Undo2,
} from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isAllowedLink } from "./extensions";

interface Tool {
  label: string;
  icon: LucideIcon;
  /** Whether the text at the cursor already has this format. */
  active?: (editor: Editor) => boolean;
  enabled?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const GROUPS: Tool[][] = [
  [
    {
      label: "Bold",
      icon: Bold,
      active: (editor) => editor.isActive("bold"),
      run: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: (editor) => editor.isActive("italic"),
      run: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      icon: Underline,
      active: (editor) => editor.isActive("underline"),
      run: (editor) => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Strikethrough",
      icon: Strikethrough,
      active: (editor) => editor.isActive("strike"),
      run: (editor) => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Inline code",
      icon: Code,
      active: (editor) => editor.isActive("code"),
      run: (editor) => editor.chain().focus().toggleCode().run(),
    },
  ],
  [
    ...([1, 2, 3] as const).map((level) => ({
      label: `Heading ${level}`,
      icon: [Heading1, Heading2, Heading3][level - 1] as LucideIcon,
      active: (editor: Editor) => editor.isActive("heading", { level }),
      run: (editor: Editor) =>
        editor.chain().focus().toggleHeading({ level }).run(),
    })),
  ],
  [
    {
      label: "Bullet list",
      icon: List,
      active: (editor) => editor.isActive("bulletList"),
      run: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      active: (editor) => editor.isActive("orderedList"),
      run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Checklist",
      icon: ListChecks,
      active: (editor) => editor.isActive("taskList"),
      run: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
  ],
  [
    {
      label: "Quote",
      icon: TextQuote,
      active: (editor) => editor.isActive("blockquote"),
      run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Code block",
      icon: SquareCode,
      active: (editor) => editor.isActive("codeBlock"),
      run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Divider",
      icon: Minus,
      run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
  ],
  [
    {
      label: "Undo",
      icon: Undo2,
      enabled: (editor) => editor.can().undo(),
      run: (editor) => editor.chain().focus().undo().run(),
    },
    {
      label: "Redo",
      icon: Redo2,
      enabled: (editor) => editor.can().redo(),
      run: (editor) => editor.chain().focus().redo().run(),
    },
  ],
];

const toolClass =
  "flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-35 aria-pressed:bg-accent aria-pressed:text-foreground";

/** The formatting controls above a document. */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const linkId = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [linkError, setLinkError] = useState<string>();
  const onLink = editor.isActive("link");
  // A link needs text to sit on: either a selection or an existing link.
  const canLink = onLink || !editor.state.selection.empty;

  function openLink() {
    setAddress(editor.getAttributes("link").href ?? "");
    setLinkError(undefined);
    setLinkOpen(true);
  }

  function applyLink(event: FormEvent) {
    event.preventDefault();
    const typed = address.trim();
    // People type "example.com"; assume they mean the secure site.
    const href = /^[a-z][a-z0-9+.-]*:/i.test(typed)
      ? typed
      : `https://${typed}`;
    if (typed === "" || !isAllowedLink(href)) {
      setLinkError("Enter a web address or a mailto: address.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  return (
    <div>
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5"
      >
        {GROUPS.map((group, index) => (
          <div
            key={group[0]?.label}
            className={cn(
              "flex items-center gap-0.5",
              index > 0 && "ml-1.5 border-l border-border pl-2",
            )}
          >
            {group.map((tool) => (
              <button
                key={tool.label}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                aria-pressed={tool.active ? tool.active(editor) : undefined}
                disabled={tool.enabled ? !tool.enabled(editor) : false}
                // Keep the selection in the document when a tool is clicked.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => tool.run(editor)}
                className={toolClass}
              >
                <tool.icon aria-hidden="true" className="size-4" />
              </button>
            ))}
            {index === 3 && (
              <button
                type="button"
                title="Link"
                aria-label="Link"
                aria-pressed={onLink}
                aria-expanded={linkOpen}
                disabled={!canLink}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => (linkOpen ? setLinkOpen(false) : openLink())}
                className={toolClass}
              >
                <Link aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {linkOpen && (
        <form
          onSubmit={applyLink}
          noValidate
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <label htmlFor={linkId} className="text-sm text-muted-foreground">
            Link address
          </label>
          <Input
            id={linkId}
            value={address}
            placeholder="https://example.com"
            className="w-72"
            onChange={(event) => setAddress(event.target.value)}
            autoFocus
          />
          <Button type="submit" size="sm">
            Apply
          </Button>
          {onLink && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeLink}
            >
              Remove link
            </Button>
          )}
          {linkError && (
            <p role="alert" className="w-full text-sm text-destructive">
              {linkError}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
