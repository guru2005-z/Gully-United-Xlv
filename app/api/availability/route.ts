import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { BOOKING_RULES, isValidDateKey } from "@/lib/booking-domain";

export async function GET(request: Request) {
  const dateKey = new URL(request.url).searchParams.get("date");
  if (!dateKey || !isValidDateKey(dateKey))
    return NextResponse.json({ error: "INVALID_DATE" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id")
      .eq("name", "Gully United XLV")
      .single();
    if (venueError || !venue)
      return NextResponse.json({ error: "VENUE_UNAVAILABLE" }, { status: 503 });
    const { data, error } = await supabase
      .from("bookings")
      .select("start_hour, status, hold_expires_at, expires_at")
      .eq("venue_id", venue.id)
      .eq("date_key", dateKey)
      .in("status", ["PENDING", "CONFIRMED", "BLOCKED", "HOLD", "PAYMENT_PENDING", "PAID"]);
    if (error) return NextResponse.json({ error: "AVAILABILITY_UNAVAILABLE" }, { status: 503 });

    const now = new Date();
    const taken = new Set<number>();
    for (const booking of data ?? []) {
      if (booking.status === "HOLD") {
        const expiry = booking.hold_expires_at || booking.expires_at;
        if (!expiry || new Date(expiry) > now) {
          taken.add(booking.start_hour);
        }
      } else {
        taken.add(booking.start_hour);
      }
    }

    return NextResponse.json({
      dateKey,
      hours: Array.from(
        { length: BOOKING_RULES.closeHour - BOOKING_RULES.openHour },
        (_, index) => BOOKING_RULES.openHour + index,
      ).map((hour) => ({ hour, available: !taken.has(hour) })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_SERVER_CONFIGURATION_MISSING")
      return NextResponse.json({ error: "SERVER_NOT_CONFIGURED" }, { status: 503 });
    return NextResponse.json({ error: "AVAILABILITY_UNAVAILABLE" }, { status: 503 });
  }
}
