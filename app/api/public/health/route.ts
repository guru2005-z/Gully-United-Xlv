import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const startTime = Date.now();
  try {
    const db = getSupabaseAdmin();

    // Probe settings or venues table reachability
    const { error: dbError } = await db.from("settings").select("key").limit(1);
    const dbHealthy = !dbError;
    const latencyMs = Date.now() - startTime;

    const rzpConfigured = !!(
      process.env["RAZORPAY_KEY_ID"] || process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"]
    );

    return NextResponse.json(
      {
        status: dbHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        version: "2.0.0-production",
        latencyMs,
        database: dbHealthy ? "connected" : "error",
        paymentSubsystem: {
          status: dbHealthy ? "operational" : "degraded",
          razorpayKeysConfigured: rzpConfigured,
        },
      },
      { status: dbHealthy ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        version: "2.0.0-production",
        error: "Health probe failed.",
      },
      { status: 503 },
    );
  }
}
