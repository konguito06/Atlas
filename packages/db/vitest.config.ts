import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // These tests talk to the local Supabase stack over HTTP.
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
