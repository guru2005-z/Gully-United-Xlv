import { NextResponse } from "next/server";
import { normalizeIndianPhone, validatePassword } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(getRateLimitKey(request, "auth:register"), 5, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many registration attempts. Try again later.",
          },
        },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const { phone, password, confirmPassword, displayName } = body;

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: { code: "PASSWORD_MISMATCH", message: "Passwords do not match." } },
        { status: 400 },
      );
    }

    const phoneResult = normalizeIndianPhone(phone);
    if (!phoneResult.success || !phoneResult.e164) {
      return NextResponse.json(
        { error: { code: "INVALID_PHONE", message: phoneResult.error } },
        { status: 422 },
      );
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.success) {
      return NextResponse.json(
        { error: { code: "WEAK_PASSWORD", message: passwordResult.error } },
        { status: 422 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      phone: phoneResult.e164,
      password,
      options: {
        data: { display_name: displayName ?? "" },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: { code: "SIGNUP_FAILED", message: error.message } },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Account created. We sent a verification code to your phone.",
      requiresOtp: true,
      phone: phoneResult.e164,
      user: data.user,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
