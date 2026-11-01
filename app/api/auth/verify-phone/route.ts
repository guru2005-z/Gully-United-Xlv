import { NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(getRateLimitKey(request, "auth:verify-phone"), 8, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many verification attempts. Try again later.",
          },
        },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const rawTarget = String(body.identifier || body.email || body.phone || "").trim();
    const token = String(body.token || "").trim();
    const type = body.type;

    if (!token || token.length < 6) {
      return NextResponse.json(
        { error: { code: "INVALID_OTP", message: "Enter the 6-digit verification code." } },
        { status: 422 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // 1. Verify Email OTP
    if (rawTarget.includes("@")) {
      const email = rawTarget.toLowerCase();
      let verifyRes = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (verifyRes.error || !verifyRes.data.user) {
        verifyRes = await supabase.auth.verifyOtp({
          email,
          token,
          type: "recovery",
        });
      }

      if (verifyRes.error || !verifyRes.data.user) {
        return NextResponse.json(
          {
            error: {
              code: "OTP_VERIFICATION_FAILED",
              message: "That OTP code is invalid or expired. Request a new code and try again.",
            },
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        message: "OTP verified successfully.",
        user: verifyRes.data.user,
        session: verifyRes.data.session,
      });
    }

    // 2. Verify Phone SMS OTP
    const phoneResult = normalizeIndianPhone(rawTarget);
    if (!phoneResult.success || !phoneResult.e164) {
      return NextResponse.json(
        { error: { code: "INVALID_PHONE", message: phoneResult.error } },
        { status: 422 },
      );
    }

    let { data, error } = await supabase.auth.verifyOtp({
      phone: phoneResult.e164,
      token,
      type: type === "recovery" ? "recovery" : "sms",
    });

    if (error || !data.user) {
      const fallbackSms = await supabase.auth.verifyOtp({
        phone: phoneResult.e164,
        token,
        type: "sms",
      });
      data = fallbackSms.data;
      error = fallbackSms.error;
    }

    if (error || !data.user) {
      return NextResponse.json(
        {
          error: {
            code: "OTP_VERIFICATION_FAILED",
            message: "That code is invalid or expired. Request a new code and try again.",
          },
        },
        { status: 400 },
      );
    }

    // Create or update public.profiles record
    try {
      const adminSupabase = await createSupabaseAdminClient();
      await adminSupabase.from("profiles").upsert(
        {
          id: data.user.id,
          role: "CUSTOMER",
          created_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    } catch {
      // Profile creation fallback
    }

    return NextResponse.json({
      message: "Phone verified successfully.",
      user: data.user,
      session: data.session,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
