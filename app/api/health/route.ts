import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";

export async function GET() {
  const startTime = Date.now();
  try {
    const supabase = await createSupabaseServerClient();

    // Check primary database tables
    const { error: venueError } = await supabase.from("venues").select("id").limit(1);
    const { error: paymentError } = await supabase.from("payments").select("id").limit(1);

    const dbHealthy = !venueError && !paymentError;
    const latencyMs = Date.now() - startTime;

    // Check Razorpay environment key status
    const rzpKeyId = process.env["RAZORPAY_KEY_ID"] || process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"];
    const rzpSecret = process.env["RAZORPAY_KEY_SECRET"];
    const rzpWebhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"];

    const razorpayConfigured = !!(rzpKeyId && rzpSecret && rzpWebhookSecret);

    return NextResponse.json(
      {
        status: dbHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        latencyMs,
        database: dbHealthy ? "connected" : "error",
        paymentSubsystem: {
          status: dbHealthy ? "operational" : "degraded",
          razorpayKeysConfigured: razorpayConfigured,
          tablesCheck: {
            venues: !venueError,
            payments: !paymentError,
          },
        },
      },
      { status: dbHealthy ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check probe failed.",
      },
      { status: 503 },
    );
  }
}
