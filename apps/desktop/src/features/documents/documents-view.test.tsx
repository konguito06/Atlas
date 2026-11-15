import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  createFakeData,
  documentNamed,
  renderApp as renderWholeApp,
} from "@/test/fakes";

// Documents is not the first page, so open it before each check.
async function renderApp(data: Parameters<typeof renderWholeApp>[0]) {
  renderWholeApp(data);
  fireEvent.click(await screen.findByRole("button", { name: "Documents" }));
  await screen.findByRole("navigation", { name: "Library" });
}

/** The titles listed in the library, top to bottom. */
function listed() {
  const list = screen.queryByRole("list", { name: "Documents" });
  return list
    ? within(list)
        .getAllByRole("button", { name: /^Open / })
        .map((button) => button.textContent)
    : [];
}

const library = () =>
  within(screen.getByRole("navigation", { name: "Library" }));

function titleInput() {
  return screen.getByLabelText("Document title") as HTMLInputElement;
}

async function open(title: string) {
  fireEvent.click(await screen.findByRole("button", { name: `Open ${title}` }));
  await screen.findByLabelText("Document title");
}

const tripPlan = documentNamed("Trip plan", "trip", {
  updatedAt: "2026-11-10T10:00:00.000Z",
  folderId: "travel",
});
const readingList = documentNamed("Reading list", "reading", {
  updatedAt: "2026-11-12T10:00:00.000Z",
  favorite: true,
});
const budget = documentNamed("Lisbon trip budget", "budget", {
  updatedAt: "2026-11-11T10:00:00.000Z",
  folderId: "travel",
});
const shelf = {
  documents: [tripPlan, readingList, budget],
  folders: [{ id: "travel", name: "Travel" }],
};

test("lists every document, most recently edited first, with its folder and date", async () => {
  await renderApp(createFakeData(shelf));

  await waitFor(() =>
    expect(listed()).toEqual([
      "Reading list",
      "Lisbon trip budget",
      "Trip plan",
    ]),
  );
  const rows = within(screen.getByRole("list", { name: "Documents" }))
    .getAllByRole("listitem")
    .map((row) => row.textContent);
  expect(rows[1]).toBe("Lisbon trip budgetTravel11 Nov 2026");
});

test("an empty library invites the person to create a document", async () => {
  await renderApp(createFakeData());

  expect(
    await screen.findByText("No documents yet. Create one to start writing."),
  ).toBeDefined();
});

test("a document opens from the library and the library is one step back", async () => {
  await renderApp(createFakeData(shelf));

  await open("Trip plan");
  expect(titleInput().value).toBe("Trip plan");

  fireEvent.click(
    screen.getByRole("button", {
      name: "Documents",
      // Not the sidebar's Documents, which is the current section.
      current: false,
    }),
  );
  await waitFor(() => expect(listed()).toHaveLength(3));
});

test("a new document opens ready to be named", async () => {
  await renderApp(createFakeData(shelf));

  fireEvent.click(screen.getByRole("button", { name: "New document" }));

  await screen.findByLabelText("Document title");
  expect(titleInput().value).toBe("");
  expect(document.activeElement).toBe(titleInput());
});

test("search narrows the list by the words in the title", async () => {
  await renderApp(createFakeData(shelf));
  await waitFor(() => expect(listed()).toHaveLength(3));

  fireEvent.change(screen.getByLabelText("Search documents"), {
    target: { value: "trip" },
  });
  expect(listed()).toEqual(["Lisbon trip budget", "Trip plan"]);

  fireEvent.change(screen.getByLabelText("Search documents"), {
    target: { value: "paris" },
  });
  expect(listed()).toEqual([]);
  expect(screen.getByText("No document's title matches that.")).toBeDefined();
});

test("favourites shows starred documents, and a star can be given and taken away", async () => {
  await renderApp(createFakeData(shelf));
  await waitFor(() => expect(listed()).toHaveLength(3));

  fireEvent.click(screen.getByRole("button", { name: "Favourite Trip plan" }));
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Favourite Trip plan" })
        .getAttribute("aria-pressed"),
    ).toBe("true"),
  );

  fireEvent.click(library().getByRole("button", { name: "Favourites" }));
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Favourites",
  );
  expect(listed()).toEqual(["Reading list", "Trip plan"]);

  fireEvent.click(
    screen.getByRole("button", { name: "Favourite Reading list" }),
  );
  await waitFor(() => expect(listed()).toEqual(["Trip plan"]));
});

test("with no favourites, says how to make one", async () => {
  await renderApp(createFakeData({ documents: [tripPlan] }));

  fireEvent.click(library().getByRole("button", { name: "Favourites" }));

  expect(
    await screen.findByText(
      "No favourites yet. Star a document to keep it here.",
    ),
  ).toBeDefined();
});

test("a folder shows its documents, and a document created there is filed in it", async () => {
  await renderApp(createFakeData(shelf));

  fireEvent.click(await library().findByRole("button", { name: "Travel" }));
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Travel");
  expect(listed()).toEqual(["Lisbon trip budget", "Trip plan"]);

  fireEvent.click(screen.getByRole("button", { name: "New document" }));
  await screen.findByLabelText("Document title");
  expect((screen.getByLabelText("Folder") as HTMLSelectElement).value).toBe(
    "travel",
  );
});

test("a folder is created and opened", async () => {
  await renderApp(createFakeData({ documents: [tripPlan] }));

  fireEvent.click(library().getByRole("button", { name: "New folder" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Create folder" }));
  expect(dialog.getByRole("alert").textContent).toBe("Give the folder a name.");

  fireEvent.change(dialog.getByLabelText("Name"), {
    target: { value: "University" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Create folder" }));

  expect(
    await screen.findByRole("heading", { level: 1, name: "University" }),
  ).toBeDefined();
  expect(screen.getByText("This folder is empty.")).toBeDefined();
});

test("a folder that cannot be saved says so", async () => {
  await renderApp(createFakeData({ failing: ["saveFolder"] }));
  fireEvent.click(library().getByRole("button", { name: "New folder" }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.change(dialog.getByLabelText("Name"), {
    target: { value: "University" },
  });

  fireEvent.click(dialog.getByRole("button", { name: "Create folder" }));

  expect((await dialog.findByRole("alert")).textContent).toBe(
    "Could not create the folder.",
  );
});

test("a folder can be renamed", async () => {
  await renderApp(createFakeData(shelf));
  fireEvent.click(await library().findByRole("button", { name: "Travel" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit folder" }));
  const dialog = within(await screen.findByRole("dialog"));

  fireEvent.change(dialog.getByLabelText("Name"), {
    target: { value: "Trips" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByRole("heading", { level: 1, name: "Trips" }),
  ).toBeDefined();
});

test("deleting a folder keeps its documents", async () => {
  await renderApp(createFakeData(shelf));
  fireEvent.click(await library().findByRole("button", { name: "Travel" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit folder" }));

  fireEvent.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Delete folder",
    }),
  );

  expect(
    await screen.findByRole("heading", { level: 1, name: "Documents" }),
  ).toBeDefined();
  expect(library().queryByRole("button", { name: "Travel" })).toBeNull();
  expect(listed()).toEqual(["Reading list", "Lisbon trip budget", "Trip plan"]);
});

test("an open document can be moved to a folder and starred", async () => {
  await renderApp(createFakeData(shelf));
  await open("Reading list");

  fireEvent.change(screen.getByLabelText("Folder"), {
    target: { value: "travel" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Favourite" }));
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Favourite" })
        .getAttribute("aria-pressed"),
    ).toBe("false"),
  );

  fireEvent.click(screen.getByText("Documents", { selector: "button" }));
  fireEvent.click(await library().findByRole("button", { name: "Travel" }));
  expect(listed()).toEqual(["Reading list", "Lisbon trip budget", "Trip plan"]);
});

test("renaming a document updates the library", async () => {
  await renderApp(createFakeData({ documents: [tripPlan] }));
  await open("Trip plan");

  fireEvent.change(titleInput(), { target: { value: "Lisbon trip" } });
  fireEvent.blur(titleInput());
  fireEvent.click(screen.getByText("Documents", { selector: "button" }));

  await waitFor(() => expect(listed()).toEqual(["Lisbon trip"]));
});

test("a rename that fails says so and keeps the old title in the library", async () => {
  await renderApp(
    createFakeData({ documents: [tripPlan], failing: ["rename"] }),
  );
  await open("Trip plan");

  fireEvent.change(titleInput(), { target: { value: "Lisbon trip" } });
  fireEvent.blur(titleInput());

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe("Could not rename the document.");
  fireEvent.click(screen.getByText("Documents", { selector: "button" }));
  await waitFor(() => expect(listed()).toEqual(["Trip plan"]));
});

test("deleting asks first, and cancelling keeps the document", async () => {
  await renderApp(createFakeData({ documents: [tripPlan] }));
  await open("Trip plan");

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(titleInput().value).toBe("Trip plan");
  expect(screen.getByRole("button", { name: "Delete" })).toBeDefined();
});

test("confirming a delete removes the document and returns to the library", async () => {
  await renderApp(createFakeData({ documents: [tripPlan, readingList] }));
  await open("Trip plan");

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete document" }));

  await waitFor(() => expect(listed()).toEqual(["Reading list"]));
});

test("a failed load explains itself and offers a retry", async () => {
  await renderApp(createFakeData({ documents: [], failing: ["list"] }));

  expect(
    await screen.findByText("Could not load your documents."),
  ).toBeDefined();
  expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
});
