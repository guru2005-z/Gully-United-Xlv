import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorizationFailure, requireAdminUser } from "@/lib/admin-auth";
import { getStoredSettings, saveStoredSetting } from "@/lib/promo-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;

    const settings = await getStoredSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ settings: {} });
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;
    const supabase = await createSupabaseServerClient();

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: { message: "Key and value required." } }, { status: 400 });
    }

    try {
      const db = getSupabaseAdmin();
      await db.from("website_settings").upsert({
        key,
        value,
        updated_by: authData.user.id,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Ignore if website_settings table doesn't exist
    }

    await saveStoredSetting(key, value);

    return NextResponse.json({ message: `Setting '${key}' updated successfully.` });
  } catch {
    return NextResponse.json({ error: { message: "Failed to update settings." } }, { status: 500 });
  }
}
