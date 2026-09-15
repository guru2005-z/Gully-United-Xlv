import { NextResponse } from "next/server";
import { maskPhone } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ authenticated: false, user: null, profile: null });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userData.user.id,
        phone: userData.user.phone ? maskPhone(userData.user.phone) : null,
        rawPhone: userData.user.phone,
        email: userData.user.email,
        createdAt: userData.user.created_at,
      },
      profile: profile ?? {
        id: userData.user.id,
        role: "CUSTOMER",
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null, profile: null });
  }
}
