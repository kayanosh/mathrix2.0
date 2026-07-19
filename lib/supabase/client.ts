import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Deferred construction: pages import and call createClient() during render,
// so throwing here breaks static prerendering and CI builds that have no
// Supabase env vars. The proxy lets the page shell render; a missing config
// surfaces at the first real API call with a clear message.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  client = createBrowserClient(url, anonKey);
  return client;
}

export function createClient(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
      const value = Reflect.get(getClient() as object, prop, receiver);
      return typeof value === "function" ? value.bind(getClient()) : value;
    },
  });
}
