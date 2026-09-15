import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAdminEnv } from "./env";

export function getSupabaseAdmin() {
  const { url, serviceRoleKey } = requireSupabaseAdminEnv();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
