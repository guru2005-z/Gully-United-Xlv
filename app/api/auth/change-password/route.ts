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
            code: "UNAUTHENTICATED",
            message: "Your session expired. Please sign in again.",
          },
        },
        { status: 401 },
      );
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    try {
      const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
      const adminSupabase = getSupabaseAdmin();
      await adminSupabase.auth.admin.updateUserById(userData.user.id, {
        password: newPassword,
        email_confirm: true,
        phone_confirm: true,
      });
    } catch (adminErr) {
      console.warn("Service role admin password sync warning:", adminErr);
    }

    if (error) {
      return NextResponse.json(
        {
          error: {
            code: "UPDATE_FAILED",
            message: error.message || "We could not update your password. Please try again.",
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Password updated successfully.",
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "We could not update your password. Please try again.",
        },
      },
      { status: 500 },
    );
  }
}
