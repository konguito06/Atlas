import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `--dir src` runs the unit tests; `--dir tests` runs the ones that need
    // the local Supabase stack (pnpm db:test).
    include: ["**/*.test.ts"],
    testTimeout: 15_000,
  },
});
