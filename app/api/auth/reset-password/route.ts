import { NextResponse } from "next/server";
import { validatePassword } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { newPassword, confirmNewPassword } = body;

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json(
        { error: { code: "PASSWORD_MISMATCH", message: "Passwords do not match." } },
        { status: 400 },
      );
    }

    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.success) {
      return NextResponse.json(
        { error: { code: "WEAK_PASSWORD", message: passwordResult.error } },
        { status: 422 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json(
        {
          error: {
            code: "SESSION_EXPIRED",
            message: "Your password reset session expired. Start again.",
          },
        },
        { status: 401 },
      );
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return NextResponse.json(
        { error: { code: "UPDATE_FAILED", message: error.message } },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Your password was updated. Please sign in with your new password.",
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
