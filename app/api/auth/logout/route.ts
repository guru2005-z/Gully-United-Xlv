import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return NextResponse.json({ message: "Signed out successfully." });
  } catch {
    return NextResponse.json({ message: "Signed out successfully." });
  }
}
