import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createRazorpayOrder } from "@/lib/adapters/razorpay-adapter";
import {
  calculateGstPaise,
  calculateSlotPrice,
  isBookingDateValid,
  VENUE_RULES,
} from "@/lib/domain/venue";
import { normalizeIndianPhone } from "@/lib/auth-domain";
import { getStoredCoupons } from "@/lib/promo-store";

const createOrderSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID format.").optional(),
  date: z.string().optional(),
  hour: z.number().int().min(6).max(22).optional(),
  hours: z.array(z.number().int().min(6).max(22)).min(1).max(17).optional(),
  players: z.number().int().min(1).max(16).optional(),
  idempotencyKey: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  couponCode: z.string().optional(),
  discountPaise: z.number().optional(),
});

interface TargetBookingRecord {
  id: string;
  user_id?: string;
  public_reference?: string;
  reference?: string;
  customer_name?: string;
  customer_phone?: string;
  phone?: string;
  customer_email?: string;
  email?: string;
  booking_date?: string;
  date_key?: string;
  start_hour: number;
  players?: number;
  amount_paise?: number;
}

async function resolveCouponDiscount(
  _db: ReturnType<typeof getSupabaseAdmin>,
  code: string | undefined,
  amountPaise: number,
): Promise<number> {
  if (!code) return 0;
  const cleanCode = code.toUpperCase().trim();
  const coupons = await getStoredCoupons();
  const coupon = coupons.find((c) => c.code.toUpperCase().trim() === cleanCode && c.is_active);
  if (!coupon) return 0;
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
  return Math.min(amountPaise, Math.min(discount, coupon.max_discount_paise || discount));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = createOrderSchema.safeParse(body);

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

    const {
      bookingId,
      date,
      hour,
      hours,
      players = 12,
      idempotencyKey,
      customerName,
      customerPhone,
      customerEmail,
      couponCode,
      discountPaise: _providedDiscountPaise,
    } = parseResult.data;

    const hoursList = Array.from(
      new Set(hours && hours.length > 0 ? hours : hour !== undefined ? [hour] : []),
    ).sort((a, b) => a - b);

    const supabase = await createSupabaseServerClient();
    const db = getSupabaseAdmin();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    if (bookingId && !userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in before paying for a booking." } },
        { status: 401 },
      );
    }

    let targetBooking: TargetBookingRecord | null = null;
    const allBookingIds: string[] = [];
    let totalOrderAmountPaise: number | null = null;

    const keyId = process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"] || process.env["RAZORPAY_KEY_ID"];
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_NOT_CONFIGURED",
            message:
              "Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured.",
          },
        },
        { status: 503 },
      );
    }

    // 1. Handle Idempotency Key check
    if (idempotencyKey) {
      const { data: existingPayment } = await db
        .from("payments")
        .select("*, bookings(*)")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingPayment) {
        return NextResponse.json({
          keyId,
          bookingId: existingPayment.booking_id,
          orderId: existingPayment.razorpay_order_id,
          amountPaise: existingPayment.amount_paise,
          currency: existingPayment.currency,
          bookingRef:
            existingPayment.bookings?.public_reference || existingPayment.bookings?.reference,
          customerPrefill: {
            name: existingPayment.bookings?.customer_name,
            phone: existingPayment.bookings?.customer_phone || existingPayment.bookings?.phone,
            email: existingPayment.bookings?.customer_email || existingPayment.bookings?.email,
          },
        });
      }
    }

    // 2. Fetch or create booking hold
    if (bookingId) {
      const { data: existing, error: fetchErr } = await db
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Booking not found." } },
          { status: 404 },
        );
      }
      if (!existing.user_id || existing.user_id !== userId) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "This booking does not belong to you." } },
          { status: 403 },
        );
      }
      targetBooking = existing as unknown as TargetBookingRecord;
      allBookingIds.push(existing.id);
    } else if (date && hoursList.length > 0) {
      const emailResult = z
        .string()
        .trim()
        .email()
        .safeParse(customerEmail || "");
      if (!customerName || customerName.trim().length < 2 || !emailResult.success) {
        return NextResponse.json(
          { error: { code: "INVALID_CUSTOMER", message: "Name and email are required." } },
          { status: 422 },
        );
      }

      const phoneResult = normalizeIndianPhone(customerPhone || "");
      if (!phoneResult.success || !phoneResult.e164) {
        return NextResponse.json(
          { error: { code: "INVALID_PHONE", message: phoneResult.error } },
          { status: 422 },
        );
      }

      const dateCheck = isBookingDateValid(date);
      if (!dateCheck.valid) {
        return NextResponse.json(
          { error: { code: "INVALID_DATE", message: dateCheck.reason } },
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

      const slotPricesPaise = hoursList.map((h) => calculateSlotPrice(h).amountPaise);
      const totalBasePaise = slotPricesPaise.reduce((sum, p) => sum + p, 0);
      const discountPaise = await resolveCouponDiscount(db, couponCode, totalBasePaise);
      const subtotalPaise = Math.max(0, totalBasePaise - discountPaise);
      const gstPaise = calculateGstPaise(subtotalPaise);
      const finalAmountPaise = subtotalPaise + gstPaise;
      totalOrderAmountPaise = finalAmountPaise;

      const basePublicRef = `GUX-${Math.floor(1000 + Math.random() * 9000)}`;
      let allocatedPaise = 0;

      for (let i = 0; i < hoursList.length; i++) {
        const slotHour = hoursList[i]!;
        const slotBasePaise = slotPricesPaise[i]!;
        const isLast = i === hoursList.length - 1;
        const slotPaise = isLast
          ? Math.max(0, finalAmountPaise - allocatedPaise)
          : Math.round((finalAmountPaise * slotBasePaise) / Math.max(1, totalBasePaise));
        allocatedPaise += slotPaise;

        const slotRef = hoursList.length === 1 ? basePublicRef : `${basePublicRef}-${i + 1}`;
        const { data: holdResult, error: holdError } = await db.rpc("create_booking_hold", {
          p_venue_id: venue.id,
          p_customer_name: customerName.trim(),
          p_customer_phone: phoneResult.e164,
          p_customer_email: emailResult.data.toLowerCase(),
          p_players: players,
          p_booking_date: date,
          p_start_hour: slotHour,
          p_amount_paise: slotPaise,
          p_public_reference: slotRef,
          p_hold_duration_minutes: VENUE_RULES.holdDurationMinutes,
        });

        if (holdError) {
          return NextResponse.json(
            {
              error: {
                code: holdError.code === "23505" ? "SLOT_UNAVAILABLE" : "SLOT_HOLD_FAILED",
                message:
                  holdError.code === "23505"
                    ? "One of the selected slots was just booked by another player. Please choose another time."
                    : holdError.message,
              },
            },
            { status: holdError.code === "23505" ? 409 : 400 },
          );
        }

        const createdBookingId = holdResult?.[0]?.booking_id || holdResult?.booking_id;
        const { data: createdHold } = await db
          .from("bookings")
          .select("*")
          .eq("id", createdBookingId)
          .single();

        if (!createdHold) {
          return NextResponse.json(
            { error: { code: "BOOKING_RESOLVE_FAILED", message: "Failed to resolve booking." } },
            { status: 500 },
          );
        }

        if (userId) {
          const { error: userIdErr } = await db
            .from("bookings")
            .update({ customer_id: userId })
            .eq("id", createdHold.id);
          if (userIdErr) {
            await db.from("bookings").update({ user_id: userId }).eq("id", createdHold.id);
          }
        }

        allBookingIds.push(createdHold.id);
        if (!targetBooking) {
          targetBooking = createdHold as unknown as TargetBookingRecord;
        }
      }
    } else {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "bookingId or date & hour(s) required." } },
        { status: 400 },
      );
    }

    if (!targetBooking) {
      return NextResponse.json(
        { error: { code: "BOOKING_RESOLVE_FAILED", message: "Failed to resolve booking." } },
        { status: 400 },
      );
    }

    const priceInfo = calculateSlotPrice(targetBooking.start_hour);
    const amountPaise =
      totalOrderAmountPaise ?? targetBooking.amount_paise ?? priceInfo.amountPaise;
    const publicRef = targetBooking.public_reference || targetBooking.reference || "GUX-HOLD";

    // 3. Create Razorpay Order with retries
    const razorpayOrder = await createRazorpayOrder({
      amountPaise,
      currency: "INR",
      receipt: publicRef,
      notes: {
        booking_id: targetBooking.id,
        booking_ids: allBookingIds.join(","),
        turf: "Gully United XLV",
        date: targetBooking.booking_date || targetBooking.date_key || "",
        hour: hoursList.length > 0 ? hoursList.join(",") : String(targetBooking.start_hour),
        players: String(targetBooking.players || 12),
      },
    });

    // 4. Update booking(s) with Razorpay Order ID
    const { error: bookingUpdateError } = await db
      .from("bookings")
      .update({
        razorpay_order_id: razorpayOrder.id,
        payment_order_id: razorpayOrder.id,
        payment_provider: "razorpay",
        status: "HOLD",
        payment_status: "UNPAID",
        updated_at: new Date().toISOString(),
      })
      .in("id", allBookingIds.length > 0 ? allBookingIds : [targetBooking.id]);

    if (bookingUpdateError) {
      return NextResponse.json(
        { error: { code: "ORDER_PERSIST_FAILED", message: "Failed to link payment order." } },
        { status: 502 },
      );
    }

    // 5. Insert payment record with status='created'
    const paymentPayload: Record<string, unknown> = {
      booking_id: targetBooking.id,
      razorpay_order_id: razorpayOrder.id,
      amount_paise: amountPaise,
      currency: "INR",
      status: "created",
      idempotency_key: idempotencyKey || `PAY_${targetBooking.id}_${Date.now()}`,
      notes: { booking_ref: publicRef },
    };

    if (userId) {
      paymentPayload["user_id"] = userId;
    }

    let payErr = (await db.from("payments").insert(paymentPayload)).error;
    if (payErr && payErr.message.includes("user_id")) {
      delete paymentPayload["user_id"];
      payErr = (await db.from("payments").insert(paymentPayload)).error;
    }

    const isMissingPaymentsTable =
      payErr &&
      (payErr.code === "PGRST205" ||
        payErr.code === "42P01" ||
        payErr.message.includes("schema cache") ||
        payErr.message.includes("payments"));

    if (payErr && !isMissingPaymentsTable) {
      return NextResponse.json(
        { error: { code: "PAYMENT_PERSIST_FAILED", message: "Failed to persist payment order." } },
        { status: 502 },
      );
    }

    if (isMissingPaymentsTable) {
      await db.from("booking_events").upsert(
        {
          booking_id: targetBooking.id,
          provider: "razorpay",
          event_key: razorpayOrder.id,
          event_type: "ORDER_CREATED",
          payload: paymentPayload,
        },
        { onConflict: "event_key" },
      );
    }

    return NextResponse.json({
      keyId,
      bookingId: targetBooking.id,
      orderId: razorpayOrder.id,
      amountPaise: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      bookingRef: publicRef,
      customerPrefill: {
        name: targetBooking.customer_name,
        phone: targetBooking.customer_phone || targetBooking.phone,
        email: targetBooking.customer_email || targetBooking.email,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Order creation failed.";
    return NextResponse.json(
      { error: { code: "PAYMENT_ORDER_FAILED", message: msg } },
      { status: 500 },
    );
  }
}
