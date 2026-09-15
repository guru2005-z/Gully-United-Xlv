import { NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase-auth-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, token, type } = body;

    const phoneResult = normalizeIndianPhone(phone);
    if (!phoneResult.success || !phoneResult.e164) {
      return NextResponse.json(
        { error: { code: "INVALID_PHONE", message: phoneResult.error } },
        { status: 422 },
      );
    }

    if (!token || typeof token !== "string" || token.trim().length < 6) {
      return NextResponse.json(
        { error: { code: "INVALID_OTP", message: "Enter the 6-digit verification code." } },
        { status: 422 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneResult.e164,
      token: token.trim(),
      type: type === "recovery" ? "recovery" : "sms",
    });

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
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
