import { NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(getRateLimitKey(request, "auth:login"), 10, 300);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again later." } },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const input = (body.phone || body.email || body.loginInput || "").trim();
    const password = body.password || "";

    if (!input || !password) {
      return NextResponse.json(
        {
          error: { code: "INVALID_CREDENTIALS", message: "Phone/email and password are required." },
        },
        { status: 400 },
      );
    }

    const isEmail = input.includes("@");
    const phoneResult = !isEmail ? normalizeIndianPhone(input) : null;
    const e164 = phoneResult?.e164 || "";

    const supabase = await createSupabaseServerClient();

    // 1. Try standard sign in with input email or phone
    const authRes = isEmail
      ? await supabase.auth.signInWithPassword({ email: input.toLowerCase(), password })
      : e164
        ? await supabase.auth.signInWithPassword({ phone: e164, password })
        : await supabase.auth.signInWithPassword({
            email: `${input}@gullyunited.internal`,
            password,
          });

    if (authRes.error || !authRes.data.user) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: authRes.error?.message || "Phone number or password is incorrect.",
          },
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      message: "Welcome back.",
      user: authRes.data.user,
      session: authRes.data.session,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
