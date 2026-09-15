import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ logs: [] });
    }

    return NextResponse.json({ logs: data || [] });
  } catch {
    return NextResponse.json({ logs: [] });
  }
}
