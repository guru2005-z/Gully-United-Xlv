import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "";
  const key =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"] || "";
  return createBrowserClient(url, key);
}
