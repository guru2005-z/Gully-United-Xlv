import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createRazorpayOrder } from "@/lib/adapters/razorpay-adapter";
import { calculateSlotPrice } from "@/lib/domain/venue";

const createOrderSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID format.").optional(),
  date: z.string().optional(),
  hour: z.number().int().min(6).max(22).optional(),
  players: z.number().int().min(1).max(20).optional(),
  idempotencyKey: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  couponCode: z.string().optional(),
  discountPaise: z.number().optional(),
});

interface TargetBookingRecord {
  id: string;
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
      players = 12,
      idempotencyKey,
      customerName,
      customerPhone,
      customerEmail,
      couponCode,
      discountPaise: providedDiscountPaise = 0,
    } = parseResult.data;

    const supabase = await createSupabaseServerClient();
    const db = getSupabaseAdmin();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    let targetBooking: TargetBookingRecord | null = null;

    // 1. Handle Idempotency Key check
    if (idempotencyKey) {
      const { data: existingPayment } = await db
        .from("payments")
        .select("*, bookings(*)")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingPayment) {
        const keyId =
          process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"] ||
          process.env["RAZORPAY_KEY_ID"] ||
          "rzp_test_mockKeyId";

        return NextResponse.json({
          keyId,
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
      targetBooking = existing as unknown as TargetBookingRecord;
    } else if (date && hour !== undefined) {
      // Resolve venue
      const { data: venue } = await db.from("venues").select("id").limit(1).single();

      const venueId = venue?.id || "00000000-0000-0000-0000-000000000001";
      const calculatedPrice = calculateSlotPrice(hour);
      const finalAmountPaise = Math.max(0, calculatedPrice.amountPaise - providedDiscountPaise);

      // Create 10-minute hold
      const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const publicRef = `GUX-${Math.floor(1000 + Math.random() * 9000)}`;

      const holdPayload: Record<string, unknown> = {
        venue_id: venueId,
        customer_name: customerName || "Guest Player",
        customer_phone: customerPhone || "9390817811",
        phone: customerPhone || "9390817811",
        customer_email: customerEmail || "Gullyunitedxlv@gmail.com",
        email: customerEmail || "Gullyunitedxlv@gmail.com",
        booking_date: date,
        date_key: date,
        start_hour: hour,
        end_hour: hour + 1,
        players,
        amount_paise: finalAmountPaise,
        amount: finalAmountPaise / 100,
        status: "HOLD",
        payment_status: "UNPAID",
        hold_expires_at: holdExpiresAt,
        expires_at: holdExpiresAt,
        public_reference: publicRef,
        reference: publicRef,
        notes: couponCode ? `Coupon Applied: ${couponCode}` : "Standard Booking",
        idempotency_key: idempotencyKey || `HOLD_${publicRef}_${Date.now()}`,
      };

      if (userId) {
        holdPayload["user_id"] = userId;
      }

      let { data: createdHold, error: createErr } = await db
        .from("bookings")
        .insert(holdPayload)
        .select("*")
        .single();

      // If user_id column is missing in older table definition, fallback without user_id
      if (createErr && createErr.message.includes("user_id")) {
        delete holdPayload["user_id"];
        const retryResult = await db.from("bookings").insert(holdPayload).select("*").single();
        createdHold = retryResult.data;
        createErr = retryResult.error;
      }

      if (createErr) {
        return NextResponse.json(
          { error: { code: "SLOT_HOLD_FAILED", message: createErr.message } },
          { status: 400 },
        );
      }

      targetBooking = createdHold as unknown as TargetBookingRecord;
    } else {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "bookingId or date & hour required." } },
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
    const amountPaise = targetBooking.amount_paise || priceInfo.amountPaise;
    const publicRef = targetBooking.public_reference || targetBooking.reference || "GUX-HOLD";

    // 3. Create Razorpay Order with retries
    const razorpayOrder = await createRazorpayOrder({
      amountPaise,
      currency: "INR",
      receipt: publicRef,
      notes: {
        booking_id: targetBooking.id,
        turf: "Gully United XLV",
        date: targetBooking.booking_date || targetBooking.date_key || "",
        hour: String(targetBooking.start_hour),
        players: String(targetBooking.players || 12),
      },
    });

    // 4. Update booking with Razorpay Order ID
    await db
      .from("bookings")
      .update({
        razorpay_order_id: razorpayOrder.id,
        payment_order_id: razorpayOrder.id,
        status: "HOLD",
        payment_status: "UNPAID",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetBooking.id);

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

    const { error: payErr } = await db.from("payments").insert(paymentPayload);
    if (payErr && payErr.message.includes("user_id")) {
      delete paymentPayload["user_id"];
      await db.from("payments").insert(paymentPayload);
    }

    const keyId =
      process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"] ||
      process.env["RAZORPAY_KEY_ID"] ||
      "rzp_test_mockKeyId";

    return NextResponse.json({
      keyId,
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
