import { Blockquote } from "@tiptap/extension-blockquote";
import { ListItem, TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

const ALLOWED_LINK = /^(https?:\/\/|mailto:)/i;

/** True for the only addresses a link may point at. */
export function isAllowedLink(url: string): boolean {
  return ALLOWED_LINK.test(url);
}

// The editor is set up to produce exactly what the document format in
// @atlas/core allows, so everything typed here can be saved. Changing one
// means changing the other.
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    // Replaced below by versions with narrower contents.
    blockquote: false,
    listItem: false,
    link: {
      openOnClick: false,
      autolink: true,
      protocols: ["http", "https", "mailto"],
      isAllowedUri: (url) => isAllowedLink(url),
    },
  }),
  // A quote holds paragraphs only; a list item holds a paragraph, then lists.
  Blockquote.extend({ content: "paragraph+" }),
  ListItem.extend({ content: "paragraph list*" }),
  TaskList,
  TaskItem.extend({ content: "paragraph list*" }).configure({ nested: true }),
  Placeholder.configure({
    placeholder: "Start writing. Type # for a heading or - for a list.",
  }),
];
