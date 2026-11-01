import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  fetchRazorpayPayment,
  verifyRazorpayPaymentSignature,
} from "@/lib/adapters/razorpay-adapter";
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

    // Fetch all bookings linked to this order (supports both single-slot and multi-slot orders)
    const { data: orderBookings } = await db
      .from("bookings")
      .select("*")
      .or(`razorpay_order_id.eq.${razorpay_order_id},payment_order_id.eq.${razorpay_order_id}`);

    let matchedBookings = orderBookings || [];
    if (matchedBookings.length === 0 && bookingId) {
      const { data: singleBooking } = await db
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();
      if (singleBooking) matchedBookings = [singleBooking];
    }

    const booking = matchedBookings[0] || null;

    if (booking) {
      const expectedAmount = matchedBookings.reduce((sum, b) => {
        const bPaise =
          b.amount_paise || (b.amount ? (b.amount > 2000 ? b.amount : b.amount * 100) : 0);
        return sum + bPaise;
      }, 0);

      const storedOrderId = booking.razorpay_order_id || booking.payment_order_id;
      if (storedOrderId && storedOrderId !== razorpay_order_id) {
        return NextResponse.json(
          {
            error: {
              code: "ORDER_MISMATCH",
              message: "Payment order does not match this booking.",
            },
          },
          { status: 400 },
        );
      }

      const { data: razorpayPayment, error: payLookupErr } = await db
        .from("payments")
        .select("amount_paise")
        .eq("razorpay_order_id", razorpay_order_id)
        .maybeSingle();

      const isMissingPaymentsTable =
        payLookupErr &&
        (payLookupErr.code === "PGRST205" ||
          payLookupErr.code === "42P01" ||
          payLookupErr.message?.includes("schema cache") ||
          payLookupErr.message?.includes("payments"));

      if (
        !isMissingPaymentsTable &&
        razorpayPayment &&
        razorpayPayment.amount_paise !== expectedAmount
      ) {
        return NextResponse.json(
          {
            error: {
              code: "AMOUNT_MISMATCH",
              message: "Payment amount does not match this booking.",
            },
          },
          { status: 400 },
        );
      }

      const providerPayment = await fetchRazorpayPayment(razorpay_payment_id);
      if (
        !providerPayment ||
        providerPayment["order_id"] !== razorpay_order_id ||
        providerPayment["amount"] !== expectedAmount ||
        providerPayment["status"] !== "captured"
      ) {
        return NextResponse.json(
          {
            error: {
              code: "PAYMENT_NOT_CAPTURED",
              message: "Razorpay payment could not be confirmed.",
            },
          },
          { status: 400 },
        );
      }

      const resolvedMethod = (providerPayment["method"] as string) || payment_method || "razorpay";

      // Confirm all bookings in the order
      await db
        .from("bookings")
        .update({
          status: "CONFIRMED",
          payment_status: "PAID",
          payment_provider: "razorpay",
          razorpay_payment_id,
          payment_id: razorpay_payment_id,
          payment_method: resolvedMethod,
          updated_at: new Date().toISOString(),
        })
        .in(
          "id",
          matchedBookings.map((b) => b.id),
        );

      if (!isMissingPaymentsTable) {
        await db.from("payments").upsert(
          {
            booking_id: booking.id,
            user_id: booking.user_id || booking.customer_id || null,
            razorpay_order_id,
            razorpay_payment_id,
            amount_paise: expectedAmount,
            status: "paid",
            method: resolvedMethod,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "razorpay_order_id" },
        );
      } else {
        await db.from("booking_events").upsert(
          {
            booking_id: booking.id,
            provider: "razorpay",
            event_key: razorpay_payment_id,
            event_type: "PAYMENT_CAPTURED",
            payload: {
              booking_id: booking.id,
              razorpay_order_id,
              razorpay_payment_id,
              amount_paise: expectedAmount,
              status: "paid",
              method: resolvedMethod,
              paid_at: new Date().toISOString(),
            },
          },
          { onConflict: "event_key" },
        );
      }

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
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to verify payment." } },
      { status: 500 },
    );
  }
}
