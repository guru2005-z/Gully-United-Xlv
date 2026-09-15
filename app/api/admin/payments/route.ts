import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { createRazorpayRefund, fetchRazorpayOrder } from "@/lib/adapters/razorpay-adapter";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin authentication required." } },
        { status: 401 },
      );
    }

    const db = getSupabaseAdmin();

    // Check admin authorization
    const { data: adminProfile } = await db
      .from("admin_profiles")
      .select("role")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const userPhone = authData.user.phone || "";
    const userEmail = authData.user.email || "";
    const isAdminContact =
      userPhone.includes("9491501919") ||
      userPhone.includes("9390817811") ||
      userEmail.toLowerCase().includes("gullyunitedxlv");

    if (!adminProfile && !isAdminContact) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have administrative access." } },
        { status: 403 },
      );
    }

    // Fetch Payments
    const { data: payments } = await db
      .from("payments")
      .select("*, bookings(*)")
      .order("created_at", { ascending: false });

    // Fetch Webhook Events
    const { data: webhooks } = await db
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch Refunds
    const { data: refunds } = await db
      .from("refunds")
      .select("*")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      payments: payments || [],
      webhooks: webhooks || [],
      refunds: refunds || [],
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

    // Admin authorization check
    const { data: adminProfile } = await db
      .from("admin_profiles")
      .select("role")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const userPhone = authData.user.phone || "";
    const userEmail = authData.user.email || "";
    const isAdminContact =
      userPhone.includes("9491501919") ||
      userPhone.includes("9390817811") ||
      userEmail.toLowerCase().includes("gullyunitedxlv");

    if (!adminProfile && !isAdminContact) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have administrative access." } },
        { status: 403 },
      );
    }

    // 1. REFUND ACTION
    if (action === "REFUND_PAYMENT") {
      if (!paymentId || !amountPaise) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "paymentId and amountPaise required." } },
          { status: 400 },
        );
      }

      const { data: payment } = await db.from("payments").select("*").eq("id", paymentId).single();
      if (!payment || !payment.razorpay_payment_id) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Payment or Razorpay Payment ID not found." } },
          { status: 404 },
        );
      }

      // Initiate Razorpay Refund API call
      const razorpayRefund = await createRazorpayRefund({
        paymentId: payment.razorpay_payment_id,
        amountPaise,
        notes: { reason: reason || "Admin refund" },
      });

      // Record refund in refunds table
      await db.from("refunds").insert({
        payment_id: payment.id,
        razorpay_refund_id: razorpayRefund.id,
        amount_paise: amountPaise,
        status: razorpayRefund.status || "processed",
        reason: reason || "Customer refund by admin",
        initiated_by: authData.user.id,
      });

      // Update payment status
      await db
        .from("payments")
        .update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (payment.booking_id) {
        await db
          .from("bookings")
          .update({
            status: "CANCELLED",
            payment_status: "refunded",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.booking_id);
      }

      // Log Security Audit
      await db.from("admin_audit_logs").insert({
        admin_email: authData.user.email || authData.user.phone,
        action: "ADMIN_REFUND_ISSUED",
        target_type: "PAYMENT",
        target_id: payment.id,
        details: { amountPaise, reason, refundId: razorpayRefund.id },
      });

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

      const isMatched =
        rzpOrder &&
        dbPayment &&
        rzpOrder["amount"] === dbPayment.amount_paise &&
        (rzpOrder["status"] === "paid" ? dbPayment.status === "paid" : true);

      return NextResponse.json({
        reconciled: true,
        isMatched: !!isMatched,
        razorpayOrder: rzpOrder,
        databasePayment: dbPayment,
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
