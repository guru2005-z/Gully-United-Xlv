import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { calculateSlotPrice, isBookingDateValid, VENUE_RULES } from "@/lib/domain/venue";
import { normalizeIndianPhone } from "@/lib/auth-domain";

const createHoldSchema = z.object({
  venueId: z.string().optional(),
  customerName: z.string().min(2, "Name must be at least 2 characters."),
  customerPhone: z.string(),
  customerEmail: z.string().email("Valid email required."),
  players: z.number().int().min(1).max(VENUE_RULES.maxPlayers),
  bookingDate: z.string(),
  startHour: z
    .number()
    .int()
    .min(VENUE_RULES.openHour)
    .max(VENUE_RULES.closeHour - 1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = createHoldSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parseResult.error.errors[0]?.message || "Invalid input.",
          },
        },
        { status: 400 },
      );
    }

    const { customerName, customerPhone, customerEmail, players, bookingDate, startHour } =
      parseResult.data;

    // Validate phone
    const phoneResult = normalizeIndianPhone(customerPhone);
    if (!phoneResult.success || !phoneResult.e164) {
      return NextResponse.json(
        { error: { code: "INVALID_PHONE", message: phoneResult.error } },
        { status: 422 },
      );
    }

    // Validate date
    const dateCheck = isBookingDateValid(bookingDate);
    if (!dateCheck.valid) {
      return NextResponse.json(
        { error: { code: "INVALID_DATE", message: dateCheck.reason } },
        { status: 422 },
      );
    }

    // Calculate price in paise
    const priceInfo = calculateSlotPrice(startHour);
    const publicRef = `GU-${Math.floor(100000 + Math.random() * 900000)}`;

    const supabase = await createSupabaseServerClient();

    // Call atomic PostgreSQL function create_booking_hold
    const { data, error } = await supabase.rpc("create_booking_hold", {
      p_venue_id: "11111111-1111-1111-1111-111111111111",
      p_customer_name: customerName,
      p_customer_phone: phoneResult.e164,
      p_customer_email: customerEmail,
      p_players: players,
      p_booking_date: bookingDate,
      p_start_hour: startHour,
      p_amount_paise: priceInfo.amountPaise,
      p_public_reference: publicRef,
      p_hold_duration_minutes: VENUE_RULES.holdDurationMinutes,
    });

    if (error) {
      if (error.code === "23505" || error.message.includes("SLOT_UNAVAILABLE")) {
        return NextResponse.json(
          {
            error: {
              code: "SLOT_UNAVAILABLE",
              message: "That slot was just booked by another player. Please choose another time.",
            },
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: { code: "HOLD_FAILED", message: error.message } },
        { status: 400 },
      );
    }

    const result = data?.[0] || data;

    return NextResponse.json(
      {
        message: "Slot hold created successfully.",
        booking: {
          id: result.booking_id,
          publicReference: result.public_reference,
          holdExpiresAt: result.hold_expires_at,
          amountPaise: priceInfo.amountPaise,
          formattedPrice: priceInfo.formattedPrice,
          status: "HOLD",
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create slot hold." } },
      { status: 500 },
    );
  }
}
