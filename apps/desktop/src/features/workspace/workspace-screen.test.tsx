import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createFakeData, renderApp } from "@/test/fakes";

afterEach(() => {
  vi.unstubAllGlobals();
});

const sidebar = () =>
  within(screen.getByRole("navigation", { name: "Sections" }));
const theme = () => document.documentElement.dataset.theme;

function currentPage() {
  return screen
    .getAllByRole("button")
    .find((button) => button.getAttribute("aria-current") === "page")
    ?.getAttribute("aria-label");
}

/** Makes the Mac report a dark or a light appearance. */
function stubSystemAppearance(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: dark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

test("the sidebar collapses to icons that keep their names, and expands again", async () => {
  renderApp(createFakeData());

  fireEvent.click(
    await screen.findByRole("button", { name: "Collapse sidebar" }),
  );

  expect(sidebar().queryByText("Documents")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Documents" }));
  expect(
    await screen.findByRole("heading", { name: "Documents" }),
  ).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(sidebar().getByText("Documents")).toBeDefined();
});

test("a collapsed sidebar is still collapsed the next time the app opens", async () => {
  localStorage.setItem("atlas.sidebar", "compact");

  renderApp(createFakeData());

  expect(
    await screen.findByRole("button", { name: "Expand sidebar" }),
  ).toBeDefined();
});

test("Command with a number or a comma goes to that page", async () => {
  renderApp(createFakeData());
  await screen.findByRole("button", { name: "Home" });

  fireEvent.keyDown(window, { key: "3", metaKey: true });
  expect(await screen.findByRole("heading", { name: "Tasks" })).toBeDefined();
  expect(currentPage()).toBe("Tasks & Exams");

  fireEvent.keyDown(window, { key: ",", metaKey: true });
  expect(
    await screen.findByRole("heading", { name: "Settings" }),
  ).toBeDefined();
});

test("a number typed without Command goes nowhere", async () => {
  renderApp(createFakeData());
  await screen.findByRole("button", { name: "Home" });

  fireEvent.keyDown(window, { key: "2" });

  expect(currentPage()).toBe("Home");
});

test("the appearance can be set to dark or light, and is remembered", async () => {
  renderApp(createFakeData());
  fireEvent.click(await screen.findByRole("button", { name: "Settings" }));

  fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
  expect(theme()).toBe("dark");
  expect(localStorage.getItem("atlas.appearance")).toBe("dark");

  fireEvent.click(screen.getByRole("radio", { name: "Light" }));
  expect(theme()).toBe("light");
});

test("left on System, the app follows the Mac's appearance", async () => {
  stubSystemAppearance(true);

  renderApp(createFakeData());
  fireEvent.click(await screen.findByRole("button", { name: "Settings" }));

  expect(
    (screen.getByRole("radio", { name: "System" }) as HTMLInputElement).checked,
  ).toBe(true);
  expect(theme()).toBe("dark");
});

test("a chosen appearance wins over the Mac's", async () => {
  stubSystemAppearance(true);
  localStorage.setItem("atlas.appearance", "light");

  renderApp(createFakeData());
  await screen.findByRole("button", { name: "Home" });

  expect(theme()).toBe("light");
});

test("the sidebar can be made compact from Settings", async () => {
  renderApp(createFakeData());
  fireEvent.click(await screen.findByRole("button", { name: "Settings" }));

  fireEvent.click(screen.getByRole("radio", { name: "Compact" }));

  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDefined();
});

test("the four sections are Home, Documents, Tasks & Exams and Schedule, in that order", async () => {
  renderApp(createFakeData());
  await screen.findByRole("button", { name: "Home" });

  const [sections] = sidebar().getAllByRole("list");
  expect(
    within(sections as HTMLElement)
      .getAllByRole("button")
      .map((button) => button.textContent),
  ).toEqual(["Home", "Documents", "Tasks & Exams", "Schedule"]);
});
