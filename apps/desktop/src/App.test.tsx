import { APP_NAME } from "@atlas/core";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App";

test("shows the app name from the shared core package", () => {
  render(<App />);

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(APP_NAME);
});
