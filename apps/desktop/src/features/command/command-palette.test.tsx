import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  createFakeData,
  documentNamed,
  eventNamed,
  examNamed,
  renderApp,
  taskNamed,
} from "@/test/fakes";

// Pin the clock: Friday 13 November 2026, 11:30.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 13, 11, 30));
});
afterEach(() => {
  vi.useRealTimers();
});

const text = (words: string) => ({
  version: 1,
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: words }] }],
});

const workspace = {
  documents: [documentNamed("Trip plan"), documentNamed("Relatório final")],
  contents: {
    "Trip plan": text("Three days in Lisbon. Book the night train early."),
  },
  tasks: [taskNamed("Book the dentist", { dueDate: "2026-11-13" })],
  exams: [examNamed("Algorithms", "2026-11-17")],
  events: [eventNamed("Lisbon flight", "2026-12-04", 420, 540)],
};

async function openPalette(seed: Parameters<typeof createFakeData>[0] = {}) {
  renderApp(createFakeData(seed));
  await screen.findByRole("button", { name: "Home" });
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  return screen.findByRole("combobox");
}

function type(value: string) {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });
}

const options = () =>
  screen.queryAllByRole("option").map((option) => option.textContent);

const selected = () =>
  screen
    .getAllByRole("option")
    .find((option) => option.getAttribute("aria-selected") === "true")
    ?.textContent;

const press = (key: string) =>
  fireEvent.keyDown(screen.getByRole("combobox"), { key });

test("Command-K opens it on the four sections and New document, and closes it again", async () => {
  await openPalette();

  expect(options()).toEqual([
    "HomeGo to",
    "DocumentsGo to",
    "Tasks & ExamsGo to",
    "ScheduleGo to",
    "New documentActions",
  ]);

  fireEvent.keyDown(window, { key: "k", metaKey: true });
  await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
});

test("the Search button in the sidebar opens it too", async () => {
  renderApp(createFakeData());

  fireEvent.click(await screen.findByRole("button", { name: "Search" }));

  expect(await screen.findByRole("combobox")).toBeDefined();
});

test("finds a document by words inside it and opens it", async () => {
  await openPalette(workspace);

  type("night train");
  await waitFor(() =>
    expect(options()[0]).toBe(
      "Trip planThree days in Lisbon. Book the night train early.Document",
    ),
  );
  press("Enter");

  expect(
    ((await screen.findByLabelText("Document title")) as HTMLInputElement)
      .value,
  ).toBe("Trip plan");
  expect(screen.queryByRole("combobox")).toBeNull();
});

test("searches documents, tasks and events together, titles first", async () => {
  await openPalette(workspace);

  type("lisbon");

  await waitFor(() =>
    expect(options()).toEqual([
      "Lisbon flightEvent, Fri 4 Dec at 07:00",
      "Trip planThree days in Lisbon. Book the night train early.Document",
      "Add task “lisbon”Actions",
    ]),
  );
});

test("ignores accents and case", async () => {
  await openPalette(workspace);

  type("RELATORIO");

  await waitFor(() => expect(options()[0]).toBe("Relatório finalDocument"));
});

test("a found task opens as the task", async () => {
  await openPalette(workspace);

  type("dentist");
  fireEvent.click(
    await screen.findByRole("option", { name: /Book the dentist/ }),
  );

  const dialog = within(await screen.findByRole("dialog"));
  expect((dialog.getByLabelText("Title") as HTMLInputElement).value).toBe(
    "Book the dentist",
  );
});

test("a found exam opens as the exam", async () => {
  await openPalette(workspace);

  type("algo");
  await screen.findByRole("option", { name: /Algorithms/ });
  press("Enter");

  const dialog = within(await screen.findByRole("dialog"));
  expect(
    ((await dialog.findByLabelText("Subject")) as HTMLInputElement).value,
  ).toBe("Algorithms");
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  expect(await screen.findByRole("heading", { name: "Exams" })).toBeDefined();
});

test("a found event opens on its date in the calendar", async () => {
  await openPalette(workspace);

  type("flight");
  await screen.findByRole("option", { name: /Lisbon flight/ });
  press("Enter");

  const dialog = within(await screen.findByRole("dialog"));
  expect(
    ((await dialog.findByLabelText("Title")) as HTMLInputElement).value,
  ).toBe("Lisbon flight");
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe(
    "30 Nov – 6 Dec",
  );
});

test("typing the name of a place goes there, including areas inside sections", async () => {
  await openPalette();

  type("dead");
  expect(options()[0]).toBe("DeadlinesGo to");
  press("Enter");

  expect(
    await screen.findByRole("heading", { name: "Deadlines" }),
  ).toBeDefined();
});

test("the arrow keys move through the list, wrapping at the ends", async () => {
  await openPalette();
  expect(selected()).toBe("HomeGo to");

  press("ArrowDown");
  expect(selected()).toBe("DocumentsGo to");
  press("ArrowUp");
  press("ArrowUp");
  expect(selected()).toBe("New documentActions");

  press("ArrowDown");
  press("ArrowDown");
  press("Enter");
  expect(
    await screen.findByRole("navigation", { name: "Library" }),
  ).toBeDefined();
});

test("what was typed can be added as a task", async () => {
  await openPalette();

  type("Buy stamps");
  fireEvent.click(
    screen.getByRole("option", { name: /Add task “Buy stamps”/ }),
  );

  expect(await screen.findByRole("heading", { name: "Tasks" })).toBeDefined();
  expect(await screen.findByText("Buy stamps")).toBeDefined();
});

test("a task that cannot be added says so and keeps the palette open", async () => {
  await openPalette({ failing: ["saveTask"] });

  type("Buy stamps");
  fireEvent.click(
    screen.getByRole("option", { name: /Add task “Buy stamps”/ }),
  );

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Could not add the task.",
  );
  expect(screen.getByRole("combobox")).toBeDefined();
});

test("New document creates one and opens it", async () => {
  await openPalette();

  type("new doc");
  press("Enter");

  expect(await screen.findByLabelText("Document title")).toBeDefined();
});

test("it opens empty the next time", async () => {
  await openPalette(workspace);
  type("lisbon");

  fireEvent.keyDown(window, { key: "k", metaKey: true });
  await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
  fireEvent.keyDown(window, { key: "k", metaKey: true });

  expect(
    ((await screen.findByRole("combobox")) as HTMLInputElement).value,
  ).toBe("");
});
