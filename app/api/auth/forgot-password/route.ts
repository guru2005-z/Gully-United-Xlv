import { NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = body;

    const phoneResult = normalizeIndianPhone(phone);
    if (!phoneResult.success || !phoneResult.e164) {
      return NextResponse.json(
        {
          message: "If an account exists for that number, we sent recovery instructions.",
        },
        { status: 200 },
      );
    }

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signInWithOtp({
      phone: phoneResult.e164,
      options: {
        shouldCreateUser: false,
      },
    });

    return NextResponse.json({
      message: "If an account exists for that number, we sent recovery instructions.",
      phone: phoneResult.e164,
    });
  } catch {
    return NextResponse.json({
      message: "If an account exists for that number, we sent recovery instructions.",
    });
  }
}
