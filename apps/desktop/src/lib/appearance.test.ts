import { expect, test } from "vitest";
import { resolveTheme } from "./appearance";

test("light and dark are used as chosen, whatever the Mac is set to", () => {
  expect(resolveTheme("light", true)).toBe("light");
  expect(resolveTheme("dark", false)).toBe("dark");
});

test("system follows the Mac", () => {
  expect(resolveTheme("system", true)).toBe("dark");
  expect(resolveTheme("system", false)).toBe("light");
});
