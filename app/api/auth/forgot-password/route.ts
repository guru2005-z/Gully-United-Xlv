import { NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(
      getRateLimitKey(request, "auth:forgot-password"),
      5,
      3600,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Too many recovery attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const { phone } = body;

    const phoneResult = normalizeIndianPhone(phone);
    if (!phoneResult.success || !phoneResult.e164) {
      return NextResponse.json(
        {
          message: "If an account exists for that number, we sent recovery instructions.",
        },
        { status: 200 },
      );
    }

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signInWithOtp({
      phone: phoneResult.e164,
      options: {
        shouldCreateUser: false,
      },
    });

    return NextResponse.json({
      message: "If an account exists for that number, we sent recovery instructions.",
      phone: phoneResult.e164,
    });
  } catch {
    return NextResponse.json({
      message: "If an account exists for that number, we sent recovery instructions.",
    });
  }
}
