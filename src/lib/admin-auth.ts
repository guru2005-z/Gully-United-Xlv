import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type AdminAuthorization =
  { user: User; db: ReturnType<typeof getSupabaseAdmin> } | NextResponse;

export async function requireAdminUser(): Promise<AdminAuthorization> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Admin authentication required." } },
      { status: 401 },
    );
  }

  const db = getSupabaseAdmin();
  const { data: profile } = await db
    .from("admin_profiles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const configuredEmails = (process.env["ADMIN_EMAILS"] || "gullyunitedxlv@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = (data.user.email || "").toLowerCase();
  const userPhone = data.user.phone || "";
  const isConfiguredAdmin =
    configuredEmails.includes(userEmail) ||
    userEmail.includes("gullyunitedxlv") ||
    userEmail.includes("kattaguravaiah") ||
    userPhone.includes("9491501919") ||
    userPhone.includes("9390817811");

  const hasRole = profile && ["admin", "super_admin"].includes(profile.role);

  if (!hasRole && !isConfiguredAdmin) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You do not have administrative access." } },
      { status: 403 },
    );
  }

  return { user: data.user, db };
}

export function isAdminAuthorizationFailure(value: AdminAuthorization): value is NextResponse {
  return value instanceof NextResponse;
}
