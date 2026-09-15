import { NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/adapters/razorpay-adapter";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { processNotificationOutbox } from "@/lib/workers/outbox-worker";
import { logEvent } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    // 1. Read raw body text before parsing
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      logEvent("warn", "Razorpay Webhook missing signature header.");
      return NextResponse.json(
        { error: { code: "MISSING_SIGNATURE", message: "Missing x-razorpay-signature header." } },
        { status: 400 },
      );
    }

    // 2. Compute HMAC-SHA256 and timing-safe compare
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      logEvent("error", "Razorpay Webhook Signature Mismatch rejected.");
      return NextResponse.json(
        { error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed." } },
        { status: 400 },
      );
    }

    const payload = JSON.parse(rawBody);
    const eventId =
      payload.event_id ||
      payload.id ||
      `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const eventName = payload.event;
    const entity =
      payload.payload?.payment?.entity ||
      payload.payload?.order?.entity ||
      payload.payload?.refund?.entity;

    const db = getSupabaseAdmin();

    // 3. Deduplication via webhook_events replay guard
    const { error: insertErr } = await db.from("webhook_events").insert({
      razorpay_event_id: eventId,
      event: eventName,
      payload,
      signature_valid: true,
      processed_at: new Date().toISOString(),
    });

    if (insertErr && (insertErr.code === "23505" || insertErr.message?.includes("unique"))) {
      logEvent("info", `Razorpay Webhook Replay Ignored: ${eventId}`);
      return NextResponse.json({ duplicate: true, received: true }, { status: 200 });
    }

    logEvent("info", `Razorpay Webhook Processing: ${eventName}`, {
      eventId,
      orderId: entity?.order_id,
      paymentId: entity?.id,
    });

    // 4. Event Processing
    if (
      eventName === "payment.captured" ||
      eventName === "order.paid" ||
      eventName === "payment.authorized"
    ) {
      const orderId = entity?.order_id || entity?.id;
      const paymentId = entity?.id;
      const amountPaise = entity?.amount;
      const method = entity?.method || "razorpay";

      if (orderId) {
        // Find target booking
        const { data: booking } = await db
          .from("bookings")
          .select("*")
          .or(`razorpay_order_id.eq.${orderId},payment_order_id.eq.${orderId}`)
          .maybeSingle();

        if (booking) {
          // 5. Amount mismatch validation check
          const expectedAmount =
            booking.amount_paise || (booking.amount ? booking.amount * 100 : 0);
          if (amountPaise && expectedAmount && amountPaise !== expectedAmount) {
            logEvent("error", "Razorpay Webhook Amount Mismatch Alert", {
              orderId,
              expectedAmount,
              receivedAmount: amountPaise,
            });

            await db.from("payments").upsert(
              {
                booking_id: booking.id,
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                amount_paise: amountPaise,
                status: "failed",
                error_code: "AMOUNT_MISMATCH",
                error_description: `Expected ${expectedAmount} paise but received ${amountPaise} paise.`,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "razorpay_order_id" },
            );

            return NextResponse.json(
              { status: "amount_mismatch", received: true },
              { status: 200 },
            );
          }

          // Confirm Booking & Payment
          await db
            .from("bookings")
            .update({
              status: "CONFIRMED",
              payment_status: "paid",
              razorpay_payment_id: paymentId,
              payment_id: paymentId,
              payment_method: method,
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);

          await db.from("payments").upsert(
            {
              booking_id: booking.id,
              user_id: booking.user_id || null,
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              amount_paise: amountPaise || expectedAmount,
              status: "paid",
              method,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "razorpay_order_id" },
          );

          // Log security audit
          await db.from("admin_audit_logs").insert({
            admin_email: "system@gullyunited.com",
            action: "WEBHOOK_PAYMENT_CONFIRMED",
            target_type: "BOOKING",
            target_id: booking.id,
            details: { orderId, paymentId, amountPaise, eventName },
          });

          processNotificationOutbox().catch(console.error);
        }
      }
    } else if (eventName === "payment.failed") {
      const orderId = entity?.order_id;
      const paymentId = entity?.id;
      const errorCode = entity?.error_code || "PAYMENT_FAILED";
      const errorDesc = entity?.error_description || "Payment attempt failed.";

      if (orderId) {
        await db
          .from("payments")
          .update({
            razorpay_payment_id: paymentId,
            status: "failed",
            error_code: errorCode,
            error_description: errorDesc,
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", orderId);
      }
    } else if (eventName === "refund.processed" || eventName === "refund.created") {
      const refundId = entity?.id;
      const paymentId = entity?.payment_id;
      const amountPaise = entity?.amount;

      if (refundId) {
        await db.from("refunds").upsert(
          {
            razorpay_refund_id: refundId,
            amount_paise: amountPaise,
            status: "processed",
            created_at: new Date().toISOString(),
          },
          { onConflict: "razorpay_refund_id" },
        );
      }
    }

    return NextResponse.json({ status: "ok", received: true }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook handler failed.";
    logEvent("error", "Razorpay Webhook Exception", { error: msg });
    return NextResponse.json({ error: { code: "WEBHOOK_FAILED", message: msg } }, { status: 500 });
  }
}
