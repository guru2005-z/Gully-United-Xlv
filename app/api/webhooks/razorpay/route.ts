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
      request.headers.get("x-razorpay-event-id") ||
      payload.event_id ||
      payload.id ||
      `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const eventName = payload.event;
    const entity =
      payload.payload?.payment?.entity ||
      payload.payload?.order?.entity ||
      payload.payload?.refund?.entity;

    const db = getSupabaseAdmin();
    const processingStartedAt = new Date().toISOString();

    // 3. Deduplication via webhook_events (or booking_events fallback if webhook_events table doesn't exist)
    const { error: insertErr } = await db.from("webhook_events").insert({
      razorpay_event_id: eventId,
      event: eventName,
      payload,
      signature_valid: true,
      processed_at: null,
      processing_started_at: processingStartedAt,
    });

    const isMissingWebhookTable =
      insertErr &&
      (insertErr.code === "PGRST205" ||
        insertErr.code === "42P01" ||
        insertErr.message?.includes("schema cache") ||
        insertErr.message?.includes("webhook_events"));

    if (isMissingWebhookTable) {
      const { error: fallbackInsertErr } = await db.from("booking_events").insert({
        provider: "razorpay_webhook",
        event_key: `wh_${eventId}`,
        event_type: eventName || "WEBHOOK",
        payload: {
          razorpay_event_id: eventId,
          event: eventName,
          amount_paise: entity?.amount || 0,
          signature_valid: true,
          processed_at: processingStartedAt,
        },
      });

      if (
        fallbackInsertErr &&
        (fallbackInsertErr.code === "23505" || fallbackInsertErr.message?.includes("unique"))
      ) {
        logEvent("info", `Razorpay Webhook Replay Ignored (booking_events): ${eventId}`);
        return NextResponse.json({ duplicate: true, received: true }, { status: 200 });
      }
    } else if (insertErr && (insertErr.code === "23505" || insertErr.message?.includes("unique"))) {
      const { data: existingEvent } = await db
        .from("webhook_events")
        .select("processed_at, processing_started_at")
        .eq("razorpay_event_id", eventId)
        .maybeSingle();
      if (existingEvent?.processed_at) {
        logEvent("info", `Razorpay Webhook Replay Ignored: ${eventId}`);
        return NextResponse.json({ duplicate: true, received: true }, { status: 200 });
      }

      const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: reclaimedEvent } = await db
        .from("webhook_events")
        .update({ processing_started_at: processingStartedAt })
        .eq("razorpay_event_id", eventId)
        .is("processed_at", null)
        .lt("processing_started_at", staleBefore)
        .select("razorpay_event_id")
        .maybeSingle();

      if (!reclaimedEvent) {
        logEvent("info", `Razorpay Webhook Already Processing: ${eventId}`);
        return NextResponse.json(
          { duplicate: true, processing: true, received: true },
          { status: 202 },
        );
      }
    }

    logEvent("info", `Razorpay Webhook Processing: ${eventName}`, {
      eventId,
      orderId: entity?.order_id,
      paymentId: entity?.id,
    });

    // 4. Event Processing
    if (eventName === "payment.captured" || eventName === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity || entity;
      const orderEntity = payload.payload?.order?.entity;
      const orderId = paymentEntity?.order_id || orderEntity?.id || entity?.id;
      const paymentId = paymentEntity?.id || orderId;
      const amountPaise = paymentEntity?.amount || orderEntity?.amount_paid || orderEntity?.amount;
      const method = paymentEntity?.method || "razorpay";

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
            booking.amount_paise ||
            (booking.amount ? (booking.amount > 2000 ? booking.amount : booking.amount * 100) : 0);

          if (amountPaise && expectedAmount && amountPaise !== expectedAmount) {
            logEvent("error", "Razorpay Webhook Amount Mismatch Alert", {
              orderId,
              expectedAmount,
              receivedAmount: amountPaise,
            });

            if (!isMissingWebhookTable) {
              await db
                .from("webhook_events")
                .update({ processed_at: new Date().toISOString() })
                .eq("razorpay_event_id", eventId);
            }
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
              payment_status: "PAID",
              payment_provider: "razorpay",
              razorpay_payment_id: paymentId,
              payment_id: paymentId,
              payment_method: method,
              amount: Math.round((amountPaise || expectedAmount) / 100),
              amount_paise: amountPaise || expectedAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);

          await db.from("payments").upsert(
            {
              booking_id: booking.id,
              user_id: booking.user_id || booking.customer_id || null,
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
      const isProcessed = eventName === "refund.processed" || entity?.status === "processed";

      if (refundId) {
        await db.from("refunds").upsert(
          {
            razorpay_refund_id: refundId,
            amount_paise: amountPaise,
            status: isProcessed ? "processed" : "pending",
            created_at: new Date().toISOString(),
          },
          { onConflict: "razorpay_refund_id" },
        );
      }

      if (isProcessed && paymentId) {
        await db
          .from("bookings")
          .update({
            status: "CANCELLED",
            payment_status: "REFUNDED",
            updated_at: new Date().toISOString(),
          })
          .or(`razorpay_payment_id.eq.${paymentId},payment_id.eq.${paymentId}`);
      }
    }

    if (!isMissingWebhookTable) {
      await db
        .from("webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("razorpay_event_id", eventId);
    }

    return NextResponse.json({ status: "ok", received: true }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook handler failed.";
    logEvent("error", "Razorpay Webhook Exception", { error: msg });
    return NextResponse.json({ error: { code: "WEBHOOK_FAILED", message: msg } }, { status: 500 });
  }
}
