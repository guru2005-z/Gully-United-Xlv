import { NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(
      getRateLimitKey(request, "auth:forgot-password"),
      8,
      3600,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { message: "Too many recovery attempts. Try again later." } },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const rawInput = String(body.identifier || body.email || body.phone || "").trim();

    if (!rawInput) {
      return NextResponse.json(
        { error: { message: "Enter your registered email or mobile number." } },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // 1. Email OTP / Recovery
    if (rawInput.includes("@")) {
      const email = rawInput.toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        // Fallback to resetPasswordForEmail if signInWithOtp fails
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${new URL(request.url).origin}/reset-password`,
        });
      }

      return NextResponse.json({
        channel: "email",
        target: email,
        message: `Verification OTP code sent to ${email}. Check your inbox (and spam folder).`,
      });
    }

    // 2. Phone SMS OTP Recovery
    const phoneResult = normalizeIndianPhone(rawInput);
    if (!phoneResult.success || !phoneResult.e164) {
      return NextResponse.json(
        { error: { message: "Enter a valid email address or 10-digit Indian mobile number." } },
        { status: 400 },
      );
    }

    const { error: smsError } = await supabase.auth.signInWithOtp({
      phone: phoneResult.e164,
      options: {
        shouldCreateUser: false,
      },
    });

    // If the admin entered their phone number (9491501919 / 9390817811) and SMS provider isn't active or fails,
    // also send the 6-digit OTP to the owner's admin email so the admin never gets locked out.
    const isOwnerAdminPhone =
      phoneResult.e164.includes("9491501919") || phoneResult.e164.includes("9390817811");

    if (smsError && isOwnerAdminPhone) {
      const fallbackEmail = "gullyunitedxlv@gmail.com";
      await supabase.auth.signInWithOtp({
        email: fallbackEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      return NextResponse.json({
        channel: "email",
        target: fallbackEmail,
        phone: phoneResult.e164,
        message: `SMS gateway not active for ${phoneResult.e164} — 6-digit recovery OTP sent to ${fallbackEmail}.`,
      });
    }

    return NextResponse.json({
      channel: "phone",
      target: phoneResult.e164,
      phone: phoneResult.e164,
      message: `6-digit recovery OTP sent to ${phoneResult.e164}.`,
    });
  } catch {
    return NextResponse.json({
      message: "If an account exists, we sent a recovery OTP code.",
    });
  }
}
