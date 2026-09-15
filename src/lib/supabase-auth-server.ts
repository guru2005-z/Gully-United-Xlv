import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireSupabaseAdminEnv } from "./env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url } = requireSupabaseAdminEnv();
  const anonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"] || "";

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Ignores setAll errors when called from Server Components
        }
      },
    },
  });
}

export async function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = requireSupabaseAdminEnv();
  const anonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"] || "";
  const keyToUse = serviceRoleKey.includes("•") ? anonKey : serviceRoleKey;

  return createServerClient(url, keyToUse, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}
