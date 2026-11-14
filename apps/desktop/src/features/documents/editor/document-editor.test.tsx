import type { AtlasData, AtlasDocument } from "@atlas/core";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { expect, test } from "vitest";
import { createFakeData, documentNamed, renderApp } from "@/test/fakes";

const paragraph = (text: string) => ({
  type: "paragraph" as const,
  content: [{ type: "text" as const, text }],
});

const tripPlan: AtlasDocument = {
  version: 1,
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Lisbon" }],
    },
    paragraph("Book the ferry"),
  ],
};

async function openDocument(seed: Parameters<typeof createFakeData>[0] = {}) {
  const data = createFakeData({
    documents: [documentNamed("Trip plan")],
    ...seed,
  });
  renderApp(data);
  fireEvent.click(await screen.findByRole("button", { name: "Documents" }));
  await screen.findByLabelText("Document title");
  return data;
}

// The editor attaches itself to its element; tests use it to stand in for
// typing and selecting, which a simulated browser cannot do in a document.
async function editor(): Promise<Editor> {
  const surface = await screen.findByLabelText("Document content");
  return (surface as unknown as { editor: Editor }).editor;
}

function tool(name: string) {
  const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
  return within(toolbar).getByRole("button", { name });
}

async function saved(data: AtlasData) {
  await waitFor(
    () => expect(screen.getByRole("status").textContent).toBe("Saved"),
    { timeout: 3000 },
  );
  return (await data.getDocumentContent("Trip plan")) as AtlasDocument;
}

test("shows what the document holds, with its word count", async () => {
  await openDocument({ contents: { "Trip plan": tripPlan } });

  expect(
    await screen.findByRole("heading", { level: 1, name: "Lisbon" }),
  ).toBeDefined();
  expect(screen.getByText("Book the ferry")).toBeDefined();
  expect(screen.getByText("4 words")).toBeDefined();
  expect(screen.getByRole("status").textContent).toBe("Saved");
});

test("saves by itself after typing", async () => {
  const data = await openDocument();

  (await editor()).commands.insertContent("Pack sunscreen");
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toBe("Saving…"),
  );

  expect(await saved(data)).toEqual({
    version: 1,
    type: "doc",
    content: [paragraph("Pack sunscreen")],
  });
  expect(screen.getByText("2 words")).toBeDefined();
});

test("the toolbar formats the selected text and shows what is active", async () => {
  const data = await openDocument({
    contents: {
      "Trip plan": { version: 1, type: "doc", content: [paragraph("ferry")] },
    },
  });

  (await editor()).commands.selectAll();
  fireEvent.click(tool("Bold"));
  fireEvent.click(tool("Underline"));

  expect(tool("Bold").getAttribute("aria-pressed")).toBe("true");
  expect(tool("Italic").getAttribute("aria-pressed")).toBe("false");
  expect(await saved(data)).toEqual({
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "ferry",
            marks: [{ type: "bold" }, { type: "underline" }],
          },
        ],
      },
    ],
  });
});

test("the toolbar turns a paragraph into a heading or a checklist", async () => {
  const data = await openDocument({
    contents: {
      "Trip plan": {
        version: 1,
        type: "doc",
        content: [paragraph("Lisbon"), paragraph("Passport")],
      },
    },
  });
  const current = await editor();

  current.commands.setTextSelection(2);
  fireEvent.click(tool("Heading 2"));
  current.commands.setTextSelection(current.state.doc.content.size - 2);
  fireEvent.click(tool("Checklist"));

  expect((await saved(data)).content).toEqual([
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Lisbon" }],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [paragraph("Passport")],
        },
      ],
    },
    // The editor keeps an empty line after a list, so writing can go on.
    { type: "paragraph" },
  ]);
});

test("a link is added to the selected text, assuming https when none is typed", async () => {
  const data = await openDocument({
    contents: {
      "Trip plan": { version: 1, type: "doc", content: [paragraph("ferry")] },
    },
  });
  const current = await editor();
  expect((tool("Link") as HTMLButtonElement).disabled).toBe(true);

  current.commands.selectAll();
  await waitFor(() =>
    expect((tool("Link") as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(tool("Link"));
  fireEvent.change(screen.getByLabelText("Link address"), {
    target: { value: "example.com/ferry" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect((await saved(data)).content).toEqual([
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "ferry",
          marks: [
            { type: "link", attrs: { href: "https://example.com/ferry" } },
          ],
        },
      ],
    },
  ]);
});

test("a link that is not a web or mail address is refused", async () => {
  await openDocument({
    contents: {
      "Trip plan": { version: 1, type: "doc", content: [paragraph("ferry")] },
    },
  });

  (await editor()).commands.selectAll();
  await waitFor(() =>
    expect((tool("Link") as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(tool("Link"));
  fireEvent.change(screen.getByLabelText("Link address"), {
    target: { value: "javascript:alert(1)" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Enter a web address or a mailto: address.",
  );
});

test("undo takes back the last change", async () => {
  const data = await openDocument();
  const current = await editor();
  expect((tool("Undo") as HTMLButtonElement).disabled).toBe(true);

  current.commands.insertContent("Oops");
  await waitFor(() =>
    expect((tool("Undo") as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(tool("Undo"));

  expect(await saved(data)).toEqual({
    version: 1,
    type: "doc",
    content: [{ type: "paragraph" }],
  });
});

test("a save that fails says so and can be tried again", async () => {
  await openDocument({ failing: ["saveContent"] });

  (await editor()).commands.insertContent("Pack sunscreen");

  await waitFor(
    () => expect(screen.getByRole("status").textContent).toBe("Could not save"),
    { timeout: 3000 },
  );
  expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
});

test("switching to another document saves the pending change first", async () => {
  const data = await openDocument({
    documents: [documentNamed("Trip plan"), documentNamed("Reading list")],
  });

  (await editor()).commands.insertContent("Pack sunscreen");
  fireEvent.click(screen.getByRole("button", { name: "Reading list" }));

  await waitFor(async () =>
    expect(await data.getDocumentContent("Trip plan")).toEqual({
      version: 1,
      type: "doc",
      content: [paragraph("Pack sunscreen")],
    }),
  );
});

test("a document from a newer version of the app is not opened for editing", async () => {
  await openDocument({
    contents: { "Trip plan": { ...tripPlan, version: 2 } },
  });

  expect(
    await screen.findByText(
      "This document was written with a newer version of ATLAS. Update the app to open it.",
    ),
  ).toBeDefined();
  expect(screen.queryByLabelText("Document content")).toBeNull();
});
