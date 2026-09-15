import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyRazorpayPaymentSignature } from "@/lib/adapters/razorpay-adapter";
import { processNotificationOutbox } from "@/lib/workers/outbox-worker";

const verifyPaymentSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID format.").optional(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  payment_method: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = verifyPaymentSchema.safeParse(body);

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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method,
    } = parseResult.data;

    // Verify HMAC SHA256 timing-safe signature
    const isValid = verifyRazorpayPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_SIGNATURE",
            message: "Razorpay payment signature verification failed.",
          },
        },
        { status: 400 },
      );
    }

    const db = getSupabaseAdmin();

    // Fetch booking
    let bookingQuery = db.from("bookings").select("*");
    if (bookingId) {
      bookingQuery = bookingQuery.eq("id", bookingId);
    } else {
      bookingQuery = bookingQuery.eq("razorpay_order_id", razorpay_order_id);
    }

    const { data: booking } = await bookingQuery.maybeSingle();

    if (booking) {
      // Idempotent update: if already confirmed by webhook, return clean success
      await db
        .from("bookings")
        .update({
          status: "CONFIRMED",
          payment_status: "paid",
          razorpay_payment_id,
          payment_id: razorpay_payment_id,
          payment_method: payment_method || "razorpay",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      await db.from("payments").upsert(
        {
          booking_id: booking.id,
          user_id: booking.user_id || null,
          razorpay_order_id,
          razorpay_payment_id,
          amount_paise: booking.amount_paise || (booking.amount ? booking.amount * 100 : 0),
          status: "paid",
          method: payment_method || "razorpay",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "razorpay_order_id" },
      );

      processNotificationOutbox().catch(console.error);

      const ref = booking.public_reference || booking.reference;
      return NextResponse.json({
        message: `Booking confirmed. Your booking reference is ${ref}.`,
        booking: {
          id: booking.id,
          publicReference: ref,
          status: "CONFIRMED",
          paymentStatus: "paid",
        },
      });
    }

    return NextResponse.json({
      message: "Payment verified successfully.",
      status: "CONFIRMED",
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to verify payment." } },
      { status: 500 },
    );
  }
}
