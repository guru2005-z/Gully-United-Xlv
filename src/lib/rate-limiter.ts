import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error || !data?.[0]) {
      return { allowed: false, limit, remaining: 0, retryAfterSeconds: windowSeconds };
    }

    return {
      allowed: data[0].allowed,
      limit,
      remaining: data[0].remaining,
      retryAfterSeconds: data[0].retry_after_seconds,
    };
  } catch {
    return { allowed: false, limit, remaining: 0, retryAfterSeconds: windowSeconds };
  }
}

export function getRateLimitKey(request: Request, scope: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${address}`;
}
