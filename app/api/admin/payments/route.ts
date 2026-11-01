import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { createRazorpayRefund, fetchRazorpayOrder } from "@/lib/adapters/razorpay-adapter";
import { isAdminAuthorizationFailure, requireAdminUser } from "@/lib/admin-auth";

export async function GET() {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;

    const db = getSupabaseAdmin();

    // 1. Fetch Payments (or synthesize from bookings if payments table does not exist)
    const { data: paymentsData, error: paymentsErr } = await db
      .from("payments")
      .select("*, bookings(*)")
      .order("created_at", { ascending: false });

    let payments = paymentsData || [];

    if (paymentsErr || payments.length === 0) {
      const { data: bookingsData } = await db
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      payments = (bookingsData || [])
        .filter(
          (b) =>
            b.razorpay_order_id ||
            b.payment_order_id ||
            b.razorpay_payment_id ||
            b.payment_id ||
            b.payment_status === "PAID" ||
            b.payment_status === "REFUNDED",
        )
        .map((b) => ({
          id: b.id,
          booking_id: b.id,
          razorpay_order_id: b.razorpay_order_id || b.payment_order_id || `order_${b.reference}`,
          razorpay_payment_id: b.razorpay_payment_id || b.payment_id || null,
          amount_paise:
            b.amount_paise || (b.amount ? (b.amount > 2000 ? b.amount : b.amount * 100) : 0),
          currency: "INR",
          status:
            b.payment_status === "PAID"
              ? "paid"
              : b.payment_status === "REFUNDED"
                ? "refunded"
                : "created",
          method: b.payment_method || "razorpay",
          created_at: b.created_at,
          bookings: b,
        }));
    }

    // 2. Fetch Webhook Events (or synthesize from booking_events)
    const { data: webhooksData, error: webhooksErr } = await db
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    let webhooks = webhooksData || [];
    if (webhooksErr || webhooks.length === 0) {
      const { data: evts } = await db
        .from("booking_events")
        .select("*")
        .eq("provider", "razorpay_webhook")
        .order("created_at", { ascending: false })
        .limit(50);

      webhooks = (evts || []).map((e) => ({
        id: e.id,
        razorpay_event_id: e.event_key,
        event: e.event_type,
        amount_paise: (e.payload as { amount_paise?: number })?.amount_paise || 0,
        duplicate: false,
        created_at: e.created_at,
      }));
    }

    // 3. Fetch Refunds
    const { data: refundsData } = await db
      .from("refunds")
      .select("*")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      payments,
      webhooks,
      refunds: refundsData || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch admin payment data.";
    return NextResponse.json(
      { error: { code: "ADMIN_PAYMENTS_ERROR", message: msg } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin authentication required." } },
        { status: 401 },
      );
    }

    const db = getSupabaseAdmin();
    const body = await request.json();
    const { action, paymentId, amountPaise, reason, razorpayOrderId } = body;

    // 1. REFUND ACTION
    if (action === "REFUND_PAYMENT") {
      if (!paymentId || !amountPaise) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "paymentId and amountPaise required." } },
          { status: 400 },
        );
      }

      const { data: payment } = await db
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .maybeSingle();

      let rzpPaymentId = payment?.razorpay_payment_id;
      let targetBookingId = payment?.booking_id;
      let maxRefundPaise = payment?.amount_paise;

      if (!rzpPaymentId) {
        const { data: booking } = await db
          .from("bookings")
          .select("*")
          .eq("id", paymentId)
          .maybeSingle();

        if (booking) {
          rzpPaymentId = booking.razorpay_payment_id || booking.payment_id;
          targetBookingId = booking.id;
          maxRefundPaise =
            booking.amount_paise ||
            (booking.amount ? (booking.amount > 2000 ? booking.amount : booking.amount * 100) : 0);
        }
      }

      if (!rzpPaymentId) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Razorpay Payment ID not found for this booking.",
            },
          },
          { status: 404 },
        );
      }

      if (
        !Number.isInteger(amountPaise) ||
        amountPaise <= 0 ||
        (maxRefundPaise && amountPaise > maxRefundPaise)
      ) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_REFUND",
              message: "Refund amount or payment state is invalid.",
            },
          },
          { status: 400 },
        );
      }

      // Initiate Razorpay Refund API call
      const razorpayRefund = await createRazorpayRefund({
        paymentId: rzpPaymentId,
        amountPaise,
        notes: { reason: reason || "Admin refund" },
      });

      // Record refund in refunds table if it exists
      await db.from("refunds").insert({
        payment_id: payment?.id || null,
        razorpay_refund_id: razorpayRefund.id,
        amount_paise: amountPaise,
        status: razorpayRefund.status || "processed",
        reason: reason || "Customer refund by admin",
        initiated_by: authData.user.id,
      });

      if (payment?.id) {
        await db
          .from("payments")
          .update({
            status: "refunded",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);
      }

      if (targetBookingId) {
        await db
          .from("bookings")
          .update({
            status: "CANCELLED",
            payment_status: "REFUNDED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetBookingId);
      }

      return NextResponse.json({
        message: `Refund of ₹${amountPaise / 100} processed successfully. Refund ID: ${razorpayRefund.id}`,
      });
    }

    // 2. RECONCILE RAZORPAY ORDER ACTION
    if (action === "RECONCILE_ORDER") {
      if (!razorpayOrderId) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "razorpayOrderId required." } },
          { status: 400 },
        );
      }

      const rzpOrder = await fetchRazorpayOrder(razorpayOrderId);
      const { data: dbPayment } = await db
        .from("payments")
        .select("*")
        .eq("razorpay_order_id", razorpayOrderId)
        .maybeSingle();

      const { data: dbBooking } = await db
        .from("bookings")
        .select("*")
        .or(`razorpay_order_id.eq.${razorpayOrderId},payment_order_id.eq.${razorpayOrderId}`)
        .maybeSingle();

      const dbRecord = dbPayment || dbBooking;
      const dbAmountPaise =
        dbPayment?.amount_paise ||
        dbBooking?.amount_paise ||
        (dbBooking?.amount ? dbBooking.amount * 100 : 0);

      const isMatched =
        rzpOrder &&
        dbRecord &&
        rzpOrder["amount"] === dbAmountPaise &&
        (rzpOrder["status"] === "paid"
          ? dbPayment?.status === "paid" || dbBooking?.payment_status === "PAID"
          : true);

      return NextResponse.json({
        reconciled: true,
        isMatched: !!isMatched,
        razorpayOrder: rzpOrder,
        databasePayment: dbRecord,
      });
    }

    return NextResponse.json(
      { error: { code: "INVALID_ACTION", message: "Unknown action specified." } },
      { status: 400 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Payment action failed.";
    return NextResponse.json({ error: { code: "ACTION_FAILED", message: msg } }, { status: 500 });
  }
}
