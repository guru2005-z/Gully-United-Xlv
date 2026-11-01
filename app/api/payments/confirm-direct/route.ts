import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  calculateGstPaise,
  calculateSlotPrice,
  isBookingDateValid,
  VENUE_RULES,
} from "@/lib/domain/venue";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { getStoredCoupons, saveStoredCoupons } from "@/lib/promo-store";

const confirmDirectSchema = z.object({
  date: z.string().min(8),
  hour: z.number().int().min(6).max(22),
  players: z.number().int().min(1).max(16).default(10),
  customerName: z.string().min(2),
  customerPhone: z.string().min(10),
  customerEmail: z.string().email(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["razorpay_me", "upi_qr"]),
  transactionRef: z.string().min(4, "Please enter your UPI UTR / Razorpay Transaction ID."),
  idempotencyKey: z.string().optional(),
});

async function resolveAndIncrementCoupon(
  code: string | undefined,
  amountPaise: number,
): Promise<number> {
  if (!code) return 0;
  const cleanCode = code.toUpperCase().trim();
  const coupons = await getStoredCoupons();
  const couponIdx = coupons.findIndex(
    (c) => c.code.toUpperCase().trim() === cleanCode && c.is_active,
  );
  if (couponIdx === -1) return 0;
  const coupon = coupons[couponIdx]!;
  if (
    coupon.usage_limit !== null &&
    coupon.usage_limit !== undefined &&
    (coupon.used_count || 0) >= coupon.usage_limit
  ) {
    return 0;
  }
  if (coupon.min_booking_amount && amountPaise < coupon.min_booking_amount * 100) {
    return 0;
  }
  const discount =
    coupon.discount_type === "PERCENTAGE"
      ? Math.round((amountPaise * coupon.discount_value) / 100)
      : coupon.discount_value * 100;
  const finalDiscount = Math.min(
    amountPaise,
    Math.min(discount, coupon.max_discount_paise || discount),
  );

  // Increment usage count
  coupons[couponIdx] = {
    ...coupon,
    used_count: (coupon.used_count || 0) + 1,
  };
  await saveStoredCoupons(coupons);

  return finalDiscount;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = confirmDirectSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parseResult.error.errors[0]?.message || "Invalid booking payment details.",
          },
        },
        { status: 400 },
      );
    }

    const {
      date,
      hour,
      players,
      customerName,
      customerPhone,
      customerEmail,
      couponCode,
      paymentMethod,
      transactionRef,
      idempotencyKey,
    } = parseResult.data;

    const supabase = await createSupabaseServerClient();
    const db = getSupabaseAdmin();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    const phoneResult = normalizeIndianPhone(customerPhone);
    if (!phoneResult.success || !phoneResult.e164) {
      return NextResponse.json(
        { error: { code: "INVALID_PHONE", message: phoneResult.error || "Invalid phone number." } },
        { status: 422 },
      );
    }

    const dateCheck = isBookingDateValid(date);
    if (!dateCheck.valid) {
      return NextResponse.json(
        { error: { code: "INVALID_DATE", message: dateCheck.reason || "Invalid booking date." } },
        { status: 422 },
      );
    }

    const { data: venue, error: venueError } = await db
      .from("venues")
      .select("id")
      .eq("name", VENUE_RULES.name)
      .single();

    if (venueError || !venue) {
      return NextResponse.json(
        { error: { code: "VENUE_UNAVAILABLE", message: "Venue is temporarily unavailable." } },
        { status: 503 },
      );
    }

    const calculatedPrice = calculateSlotPrice(hour);
    const discountPaise = await resolveAndIncrementCoupon(couponCode, calculatedPrice.amountPaise);
    const subtotalPaise = Math.max(0, calculatedPrice.amountPaise - discountPaise);
    const gstPaise = calculateGstPaise(subtotalPaise);
    const finalAmountPaise = subtotalPaise + gstPaise;
    const finalAmountRupees = Math.round(finalAmountPaise / 100);
    const gstRupees = Math.round(gstPaise / 100);

    const publicRef = `GUX-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanRef = transactionRef.trim();
    const methodLabel =
      paymentMethod === "razorpay_me"
        ? "Razorpay.me (@panabakapradeep)"
        : "Paytm UPI QR (paytm.s2zq5m0@pty)";

    // Create booking via RPC hold first, then confirm immediately
    let bookingId: string | null = null;
    let resolvedRef = publicRef;

    const { data: holdResult, error: holdError } = await db.rpc("create_booking_hold", {
      p_venue_id: venue.id,
      p_customer_name: customerName.trim(),
      p_customer_phone: phoneResult.e164,
      p_customer_email: customerEmail.trim().toLowerCase(),
      p_players: players,
      p_booking_date: date,
      p_start_hour: hour,
      p_amount_paise: finalAmountPaise,
      p_public_reference: publicRef,
      p_hold_duration_minutes: VENUE_RULES.holdDurationMinutes,
    });

    if (holdError) {
      if (holdError.code === "23505") {
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

      // Direct insert fallback if RPC is unavailable
      const { data: directBooking, error: directErr } = await db
        .from("bookings")
        .insert({
          venue_id: venue.id,
          reference: publicRef,
          customer_name: customerName.trim(),
          phone: phoneResult.e164,
          email: customerEmail.trim().toLowerCase(),
          players,
          date_key: date,
          start_hour: hour,
          amount: finalAmountRupees,
          status: "CONFIRMED",
          payment_status: "PAID",
          payment_method: paymentMethod,
          notes: `Paid via ${methodLabel} | Ref/UTR: ${cleanRef}${couponCode ? ` | Coupon: ${couponCode}` : ""}`,
          idempotency_key: idempotencyKey || `${publicRef}-${Date.now()}`,
          ...(userId ? { customer_id: userId } : {}),
        })
        .select("id, reference")
        .single();

      if (directErr || !directBooking) {
        return NextResponse.json(
          {
            error: {
              code: directErr?.code === "23505" ? "SLOT_UNAVAILABLE" : "BOOKING_FAILED",
              message:
                directErr?.code === "23505"
                  ? "That slot was just booked by another player. Please choose another time."
                  : directErr?.message || "Failed to confirm booking.",
            },
          },
          { status: directErr?.code === "23505" ? 409 : 400 },
        );
      }

      bookingId = directBooking.id;
      resolvedRef = directBooking.reference || publicRef;
    } else {
      bookingId = holdResult?.[0]?.booking_id || holdResult?.booking_id || null;
      if (bookingId) {
        const updatePayload: Record<string, unknown> = {
          status: "CONFIRMED",
          payment_status: "PAID",
          payment_method: paymentMethod,
          amount: finalAmountRupees,
          notes: `Paid via ${methodLabel} | Ref/UTR: ${cleanRef}${couponCode ? ` | Coupon: ${couponCode}` : ""}`,
        };
        if (userId) {
          updatePayload["customer_id"] = userId;
        }
        await db.from("bookings").update(updatePayload).eq("id", bookingId);
      }
    }

    if (bookingId) {
      try {
        await db.from("booking_events").upsert(
          {
            booking_id: bookingId,
            provider: paymentMethod,
            event_key: `direct_payment:${bookingId}:${cleanRef}`,
            event_type: "PAYMENT_CAPTURED",
            from_status: "HOLD",
            to_status: "CONFIRMED",
            payload: {
              razorpay_payment_id: cleanRef,
              razorpay_order_id: `DIRECT-${resolvedRef}`,
              method: paymentMethod,
              method_label: methodLabel,
              amount_paise: finalAmountPaise,
              amount_rupees: finalAmountRupees,
              gst_paise: gstPaise,
              gst_rupees: gstRupees,
              coupon_code: couponCode || null,
              discount_paise: discountPaise,
              captured_at: new Date().toISOString(),
            },
          },
          { onConflict: "event_key" },
        );
      } catch {
        // Ignore audit event error
      }
    }

    return NextResponse.json({
      verified: true,
      bookingId: bookingId || publicRef,
      bookingRef: resolvedRef,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      paymentMethod,
      amountRupees: finalAmountRupees,
      gstRupees,
    });
  } catch (err) {
    console.error("[Direct Payment Confirm Error]:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected error while confirming payment.",
        },
      },
      { status: 500 },
    );
  }
}
