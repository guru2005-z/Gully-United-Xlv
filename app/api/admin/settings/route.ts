import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("website_settings").select("*");

    if (error) {
      return NextResponse.json({ settings: {} });
    }

    const settingsMap: Record<string, unknown> = {};
    (data || []).forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    return NextResponse.json({ settings: settingsMap });
  } catch {
    return NextResponse.json({ settings: {} });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const userPhone = authData.user.phone || "";
    const userEmail = authData.user.email || "";
    const isAdminContact =
      userPhone.includes("9491501919") ||
      userPhone.includes("9390817811") ||
      userEmail.toLowerCase().includes("gullyunitedxlv");

    if (!adminProfile && !isAdminContact) {
      return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: { message: "Key and value required." } }, { status: 400 });
    }

    const { error } = await supabase.from("website_settings").upsert({
      key,
      value,
      updated_by: authData.user.id,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    // Log action
    await supabase.from("admin_audit_logs").insert({
      admin_id: authData.user.id,
      admin_email: authData.user.email || authData.user.phone,
      action: "SETTINGS_UPDATED",
      target_type: "WEBSITE_SETTINGS",
      target_id: key,
      details: value,
    });

    return NextResponse.json({ message: `Setting '${key}' updated successfully.` });
  } catch (err) {
    return NextResponse.json({ error: { message: "Failed to update settings." } }, { status: 500 });
  }
}
