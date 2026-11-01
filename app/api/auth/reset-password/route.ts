import { NextResponse } from "next/server";
import { validatePassword } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { saveStoredSetting } from "@/lib/promo-store";

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

    // Sync across all owner admin accounts if this user is the owner
    const emailLower = (userData.user.email || "").toLowerCase();
    const userPhone = userData.user.phone || "";
    const isOwnerAdmin =
      emailLower.includes("gullyunitedxlv") ||
      emailLower.includes("kattaguravaiah") ||
      userPhone.includes("9491501919") ||
      userPhone.includes("9390817811");

    if (isOwnerAdmin) {
      try {
        const adminSupabase = getSupabaseAdmin();
        const { data: usersList } = await adminSupabase.auth.admin.listUsers();
        const ownerAccounts = (usersList?.users || []).filter((u) => {
          const e = (u.email || "").toLowerCase();
          const p = u.phone || "";
          return (
            e.includes("gullyunitedxlv") ||
            e.includes("kattaguravaiah") ||
            p.includes("9491501919") ||
            p.includes("9390817811")
          );
        });

        for (const acc of ownerAccounts) {
          await adminSupabase.auth.admin.updateUserById(acc.id, {
            password: newPassword,
            email_confirm: true,
            phone_confirm: true,
          });
        }

        await saveStoredSetting("ADMIN_CUSTOM_PASSWORD_SET", {
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Ignore sync errors
      }
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
