import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { bookingRequestSchema, calculateBookingAmount, isValidSlot } from "@/lib/booking-domain";

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length > 120)
    return NextResponse.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
  const parsed = bookingRequestSchema.safeParse(await request.json());
  if (!parsed.success || !isValidSlot(parsed.data.dateKey, parsed.data.hour))
    return NextResponse.json({ error: "INVALID_BOOKING" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id")
      .eq("name", "Gully United XLV")
      .single();
    if (venueError || !venue)
      return NextResponse.json({ error: "VENUE_UNAVAILABLE" }, { status: 503 });
    const { data: existing } = await supabase
      .from("bookings")
      .select("*")
      .eq("venue_id", venue.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing) return NextResponse.json({ booking: existing });
    const amount = calculateBookingAmount(parsed.data.hour);
    const reference = `GU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        venue_id: venue.id,
        reference,
        customer_name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        players: parsed.data.players,
        date_key: parsed.data.dateKey,
        start_hour: parsed.data.hour,
        amount,
        status: "PENDING",
        payment_status: "UNPAID",
        payment_method: "razorpay",
        idempotency_key: idempotencyKey,
      })
      .select(
        "id, reference, customer_name, phone, email, players, date_key, start_hour, amount, status, payment_status, created_at",
      )
      .single();
    if (error) {
      if (error.code === "23505") {
        // Query nearby available slots for date
        const { data: takenSlots } = await supabase
          .from("bookings")
          .select("start_hour")
          .eq("venue_id", venue.id)
          .eq("date_key", parsed.data.dateKey)
          .in("status", ["PENDING", "CONFIRMED", "HOLD", "PAID", "BLOCKED"]);

        const takenSet = new Set((takenSlots || []).map((s) => s.start_hour));
        const alternatives: number[] = [];
        for (let h = 6; h <= 22; h++) {
          if (h !== parsed.data.hour && !takenSet.has(h)) {
            alternatives.push(h);
            if (alternatives.length >= 3) break;
          }
        }

        return NextResponse.json(
          {
            error: {
              code: "SLOT_TAKEN",
              message: "That slot was just taken.",
              alternatives,
            },
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "BOOKING_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_SERVER_CONFIGURATION_MISSING")
      return NextResponse.json({ error: "SERVER_NOT_CONFIGURED" }, { status: 503 });
    return NextResponse.json({ error: "BOOKING_UNAVAILABLE" }, { status: 503 });
  }
}
