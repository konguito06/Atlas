import { describe, expect, test } from "vitest";
import {
  type AtlasDocument,
  createEmptyDocument,
  parseDocument,
} from "./document";

const paragraph = (text: string) => ({
  type: "paragraph" as const,
  content: [{ type: "text" as const, text }],
});

const everything: AtlasDocument = {
  version: 1,
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Trip plan" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Book the " },
        {
          type: "text",
          text: "ferry",
          marks: [
            { type: "bold" },
            { type: "italic" },
            { type: "link", attrs: { href: "https://example.com/ferry" } },
          ],
        },
        { type: "hardBreak" },
        {
          type: "text",
          text: "by Friday",
          marks: [{ type: "underline" }, { type: "strike" }, { type: "code" }],
        },
      ],
    },
    { type: "blockquote", content: [paragraph("Travel light.")] },
    {
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [{ type: "text", text: "const days = 3;" }],
    },
    { type: "horizontalRule" },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            paragraph("Tickets"),
            {
              type: "orderedList",
              attrs: { start: 1 },
              content: [{ type: "listItem", content: [paragraph("Ferry")] }],
            },
          ],
        },
      ],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [paragraph("Passport")],
        },
      ],
    },
  ],
};

function withFirstBlock(block: unknown) {
  return { version: 1, type: "doc", content: [block] };
}

describe("parseDocument", () => {
  test("accepts a document using every supported block and mark, unchanged", () => {
    expect(parseDocument(everything)).toEqual({
      ok: true,
      document: everything,
    });
  });

  test("accepts a new empty document", () => {
    const empty = createEmptyDocument();

    expect(parseDocument(empty)).toEqual({ ok: true, document: empty });
  });

  test("drops attributes the format does not define", () => {
    const result = parseDocument(
      withFirstBlock({
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          {
            type: "text",
            text: "site",
            marks: [
              {
                type: "link",
                attrs: { href: "https://example.com", target: "_blank" },
              },
            ],
          },
        ],
      }),
    );

    expect(result).toEqual({
      ok: true,
      document: withFirstBlock({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "site",
            marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          },
        ],
      }),
    });
  });

  test("removes formatting inside a code block", () => {
    const result = parseDocument(
      withFirstBlock({
        type: "codeBlock",
        content: [{ type: "text", text: "x", marks: [{ type: "bold" }] }],
      }),
    );

    expect(result).toEqual({
      ok: true,
      document: withFirstBlock({
        type: "codeBlock",
        content: [{ type: "text", text: "x" }],
      }),
    });
  });

  test("refuses a document written by a newer version of the app", () => {
    expect(parseDocument({ ...everything, version: 2 })).toEqual({
      ok: false,
      reason: "newer-version",
    });
  });

  test.each([
    ["a block type it does not know", { type: "table", content: [] }],
    [
      "a heading deeper than level 3",
      { type: "heading", attrs: { level: 4 }, content: [] },
    ],
    [
      "a link that runs script",
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "click",
            marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
          },
        ],
      },
    ],
    [
      "a list item that does not start with a paragraph",
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [{ type: "horizontalRule" }] }],
      },
    ],
    [
      "an empty text node",
      { type: "paragraph", content: [{ type: "text", text: "" }] },
    ],
  ])("refuses %s", (_name, block) => {
    expect(parseDocument(withFirstBlock(block))).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  test.each([
    ["nothing", undefined],
    ["a string of HTML", "<p>Hello</p>"],
    ["a document with no blocks", { version: 1, type: "doc", content: [] }],
    [
      "a document with no version",
      { type: "doc", content: [{ type: "paragraph" }] },
    ],
  ])("refuses %s", (_name, value) => {
    expect(parseDocument(value)).toEqual({ ok: false, reason: "invalid" });
  });
});
