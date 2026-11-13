import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  // Supabase applies everything in this folder on `supabase db reset`.
  out: "../../supabase/migrations",
  migrations: { prefix: "supabase" },
  casing: "snake_case",
});
