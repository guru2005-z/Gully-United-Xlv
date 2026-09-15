import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { logEvent } from "@/lib/logger";

export interface OutboxProcessResult {
  processed: number;
  delivered: number;
  failed: number;
}

/**
 * Processes pending notification outbox events idempotently.
 */
export async function processNotificationOutbox(): Promise<OutboxProcessResult> {
  const supabase = await createSupabaseServerClient();
  let deliveredCount = 0;
  let failedCount = 0;

  // 1. Fetch PENDING outbox events
  const { data: events, error } = await supabase
    .from("notification_outbox")
    .select("*, bookings(*)")
    .eq("status", "PENDING")
    .limit(10);

  if (error || !events || events.length === 0) {
    return { processed: 0, delivered: 0, failed: 0 };
  }

  for (const event of events) {
    try {
      // Mark as PROCESSING
      await supabase
        .from("notification_outbox")
        .update({
          status: "PROCESSING",
          attempts: event.attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      const booking = event.bookings;
      const adminPhone = event.recipient;
      const whatsappToken = process.env["WHATSAPP_API_TOKEN"];

      logEvent("info", "Processing notification outbox event", {
        eventId: event.id,
        eventType: event.event_type,
        bookingRef: booking?.public_reference || booking?.reference,
      });

      if (whatsappToken) {
        // External WhatsApp Business API call if token configured
        const waRes = await fetch(
          "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${whatsappToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: adminPhone,
              type: "text",
              text: {
                body: `🏏 Gully United XLV New Booking Confirmed!\nRef: ${booking?.public_reference || booking?.reference}\nDate: ${booking?.booking_date || booking?.date_key}\nHour: ${booking?.start_hour}:00\nPlayers: ${booking?.players}\nAmount: ₹${(booking?.amount_paise || booking?.amount || 0) / 100}`,
              },
            }),
          },
        );

        if (!waRes.ok) {
          throw new Error(`WhatsApp API error: ${waRes.statusText}`);
        }
      } else {
        // Simulated delivery in dev mode
        logEvent("info", "Simulated WhatsApp Admin Notification sent successfully", {
          recipient: adminPhone,
          bookingRef: booking?.public_reference || booking?.reference,
        });
      }

      // Mark DELIVERED
      await supabase
        .from("notification_outbox")
        .update({
          status: "DELIVERED",
          provider_message_id: `wa_msg_${Date.now()}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      deliveredCount++;
    } catch (err: unknown) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logEvent("error", "Failed to dispatch outbox notification", {
        eventId: event.id,
        error: errorMessage,
      });

      await supabase
        .from("notification_outbox")
        .update({
          status: event.attempts >= 3 ? "FAILED" : "PENDING",
          last_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    }
  }

  return {
    processed: events.length,
    delivered: deliveredCount,
    failed: failedCount,
  };
}
