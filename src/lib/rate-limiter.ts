import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * DB-backed Rate Limiter for public endpoints
 */
export async function checkRateLimit(
  key: string,
  limit: number = 20,
  windowSeconds: number = 60,
): Promise<RateLimitResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowSeconds * 1000).toISOString();

    const { data: existing } = await supabase
      .from("rate_limit_events")
      .select("*")
      .eq("key", key)
      .gt("expires_at", now.toISOString())
      .maybeSingle();

    if (!existing) {
      await supabase.from("rate_limit_events").insert({
        key,
        count: 1,
        expires_at: expiresAt,
      });
      return { allowed: true, limit, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    if (existing.count >= limit) {
      const retryAfter = Math.ceil(
        (new Date(existing.expires_at).getTime() - now.getTime()) / 1000,
      );
      return { allowed: false, limit, remaining: 0, retryAfterSeconds: Math.max(retryAfter, 1) };
    }

    await supabase
      .from("rate_limit_events")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id);

    return { allowed: true, limit, remaining: limit - existing.count - 1, retryAfterSeconds: 0 };
  } catch {
    // Fail-open for rate limiter errors
    return { allowed: true, limit, remaining: limit, retryAfterSeconds: 0 };
  }
}
