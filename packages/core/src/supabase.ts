import type { Database } from "@atlas/db/types";
import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";

export type AtlasClient = SupabaseClient<Database>;

export interface AtlasClientConfig {
  url: string;
  /** The publishable key only. This code runs on user devices. */
  publishableKey: string;
  /** Session storage differs per platform, so each app passes its own. */
  auth?: SupabaseClientOptions<"public">["auth"];
}

export function createAtlasClient(config: AtlasClientConfig): AtlasClient {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: config.auth,
  });
}
