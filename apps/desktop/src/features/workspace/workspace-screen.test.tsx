import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { createFakeData, documentNamed, renderSignedIn } from "@/test/fakes";

function documentLinks() {
  const list = screen.getByRole("navigation", { name: "Documents" });
  return within(list)
    .queryAllByRole("button")
    .map((button) => button.textContent);
}

function titleInput() {
  return screen.getByLabelText("Document title") as HTMLInputElement;
}

test("lists the workspace's documents and opens the newest one", async () => {
  renderSignedIn(
    createFakeData([documentNamed("Trip plan"), documentNamed("Reading list")]),
  );

  await screen.findByRole("button", { name: "Trip plan" });

  expect(documentLinks()).toEqual(["Trip plan", "Reading list"]);
  expect(titleInput().value).toBe("Trip plan");
});

test("an empty workspace invites the person to create a document", async () => {
  renderSignedIn(createFakeData());

  expect(
    await screen.findByRole("heading", { name: "No documents yet" }),
  ).toBeDefined();
  expect(screen.queryByLabelText("Document title")).toBeNull();
});

test("a new document opens at the top of the list, ready to be named", async () => {
  renderSignedIn(createFakeData([documentNamed("Trip plan")]));
  await screen.findByRole("button", { name: "Trip plan" });

  fireEvent.click(screen.getByRole("button", { name: "New document" }));

  await waitFor(() =>
    expect(documentLinks()).toEqual(["Untitled", "Trip plan"]),
  );
  expect(titleInput().value).toBe("");
  expect(document.activeElement).toBe(titleInput());
});

test("opening another document shows its title", async () => {
  renderSignedIn(
    createFakeData([documentNamed("Trip plan"), documentNamed("Reading list")]),
  );

  fireEvent.click(await screen.findByRole("button", { name: "Reading list" }));

  expect(titleInput().value).toBe("Reading list");
  expect(
    screen
      .getByRole("button", { name: "Reading list" })
      .getAttribute("aria-current"),
  ).toBe("page");
});

test("renaming a document updates the list", async () => {
  renderSignedIn(createFakeData([documentNamed("Trip plan")]));
  await screen.findByRole("button", { name: "Trip plan" });

  fireEvent.change(titleInput(), { target: { value: "Lisbon trip" } });
  fireEvent.blur(titleInput());

  await waitFor(() => expect(documentLinks()).toEqual(["Lisbon trip"]));
});

test("a rename that fails says so and puts the old title back in the list", async () => {
  renderSignedIn(createFakeData([documentNamed("Trip plan")], ["rename"]));
  await screen.findByRole("button", { name: "Trip plan" });

  fireEvent.change(titleInput(), { target: { value: "Lisbon trip" } });
  fireEvent.blur(titleInput());

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe("Could not rename the document.");
  expect(documentLinks()).toEqual(["Trip plan"]);
});

test("deleting asks first, and cancelling keeps the document", async () => {
  renderSignedIn(createFakeData([documentNamed("Trip plan")]));
  await screen.findByRole("button", { name: "Trip plan" });

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(documentLinks()).toEqual(["Trip plan"]);
  expect(screen.getByRole("button", { name: "Delete" })).toBeDefined();
});

test("confirming a delete removes the document and opens the next one", async () => {
  renderSignedIn(
    createFakeData([documentNamed("Trip plan"), documentNamed("Reading list")]),
  );
  await screen.findByRole("button", { name: "Trip plan" });

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete document" }));

  await waitFor(() => expect(documentLinks()).toEqual(["Reading list"]));
  expect(titleInput().value).toBe("Reading list");
});

test("a failed load explains itself and offers a retry", async () => {
  renderSignedIn(createFakeData([], ["list"]));

  expect(
    await screen.findByText("Could not load your documents."),
  ).toBeDefined();
  expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
});
