import { z } from "zod";

// The one document format every ATLAS client reads and writes.
//
// It is ProseMirror JSON limited to the nodes below, so Tiptap on desktop
// uses it as-is, and its nesting mirrors HTML so the native mobile editor can
// convert to and from it. See docs/decisions/0001-document-format.md.

export const DOCUMENT_VERSION = 1;

const LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

const linkHref = z.string().refine((href) => {
  try {
    return LINK_PROTOCOLS.includes(new URL(href).protocol);
  } catch {
    return false;
  }
}, "Links must use http, https or mailto");

const markSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({ type: z.literal("underline") }),
  z.object({ type: z.literal("strike") }),
  z.object({ type: z.literal("code") }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({ href: linkHref }),
  }),
]);

const textSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
  marks: z.array(markSchema).optional(),
});

const plainTextSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
});

const inlineSchema = z.discriminatedUnion("type", [
  textSchema,
  z.object({ type: z.literal("hardBreak") }),
]);

const paragraphSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(inlineSchema).optional(),
});

const headingSchema = z.object({
  type: z.literal("heading"),
  attrs: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  content: z.array(inlineSchema).optional(),
});

const blockquoteSchema = z.object({
  type: z.literal("blockquote"),
  content: z.array(paragraphSchema).min(1),
});

const codeBlockSchema = z.object({
  type: z.literal("codeBlock"),
  attrs: z.object({ language: z.string().nullable() }).optional(),
  content: z.array(plainTextSchema).optional(),
});

const horizontalRuleSchema = z.object({ type: z.literal("horizontalRule") });

export type Mark = z.infer<typeof markSchema>;
export type Inline = z.infer<typeof inlineSchema>;
export type Paragraph = z.infer<typeof paragraphSchema>;

// Lists nest, so their types are written out and the schemas are lazy.
export interface ListItem {
  type: "listItem";
  content: [Paragraph, ...List[]];
}
export interface TaskItem {
  type: "taskItem";
  attrs: { checked: boolean };
  content: [Paragraph, ...List[]];
}
export interface BulletList {
  type: "bulletList";
  content: ListItem[];
}
export interface OrderedList {
  type: "orderedList";
  attrs?: { start: number };
  content: ListItem[];
}
export interface TaskList {
  type: "taskList";
  content: TaskItem[];
}
export type List = BulletList | OrderedList | TaskList;

const listSchema: z.ZodType<List> = z.lazy(() =>
  z.discriminatedUnion("type", [
    bulletListSchema,
    orderedListSchema,
    taskListSchema,
  ]),
);

// An item is one paragraph, optionally followed by lists nested under it.
const itemContent = z.tuple([paragraphSchema]).rest(listSchema);

const listItemSchema = z.object({
  type: z.literal("listItem"),
  content: itemContent,
});

const taskItemSchema = z.object({
  type: z.literal("taskItem"),
  attrs: z.object({ checked: z.boolean() }),
  content: itemContent,
});

const bulletListSchema = z.object({
  type: z.literal("bulletList"),
  content: z.array(listItemSchema).min(1),
});

const orderedListSchema = z.object({
  type: z.literal("orderedList"),
  attrs: z.object({ start: z.number().int().min(0) }).optional(),
  content: z.array(listItemSchema).min(1),
});

const taskListSchema = z.object({
  type: z.literal("taskList"),
  content: z.array(taskItemSchema).min(1),
});

const blockSchema = z.union([
  paragraphSchema,
  headingSchema,
  blockquoteSchema,
  codeBlockSchema,
  horizontalRuleSchema,
  bulletListSchema,
  orderedListSchema,
  taskListSchema,
]);

export const documentSchema = z.object({
  version: z.literal(DOCUMENT_VERSION),
  type: z.literal("doc"),
  content: z.array(blockSchema).min(1),
});

export type Block = z.infer<typeof blockSchema>;
export type AtlasDocument = z.infer<typeof documentSchema>;

export function createEmptyDocument(): AtlasDocument {
  return {
    version: DOCUMENT_VERSION,
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

export type ParsedDocument =
  | { ok: true; document: AtlasDocument }
  // "newer-version": written by a newer app; this one must not edit it.
  | { ok: false; reason: "newer-version" | "invalid" };

/**
 * Validates stored or incoming content. Unknown attributes are dropped, so
 * the result holds only what the format defines.
 */
export function parseDocument(value: unknown): ParsedDocument {
  const version = z.object({ version: z.number() }).safeParse(value);
  if (version.success && version.data.version > DOCUMENT_VERSION) {
    return { ok: false, reason: "newer-version" };
  }

  const parsed = documentSchema.safeParse(value);
  return parsed.success
    ? { ok: true, document: parsed.data }
    : { ok: false, reason: "invalid" };
}
