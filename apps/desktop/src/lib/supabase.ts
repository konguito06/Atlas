import { createAtlasClient } from "@atlas/core";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy apps/desktop/.env.example to .env.local and fill it in.",
  );
}

export const supabase = createAtlasClient({
  url,
  publishableKey,
  // Sign-in uses a typed code, so no session ever arrives through a URL.
  auth: { detectSessionInUrl: false },
});
