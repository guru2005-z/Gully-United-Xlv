import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const adminActionSchema = z.object({
  action: z.enum([
    "BLOCK_SLOT",
    "HOLD_SLOT",
    "UNBLOCK_SLOT",
    "CANCEL_BOOKING",
    "MARK_COMPLETED",
    "OFFLINE_BOOKING",
    "START_REFUND",
    "ADD_NOTE",
  ]),
  bookingId: z.string().uuid().optional(),
  bookingDate: z.string().optional(),
  startHour: z.number().int().min(6).max(22).optional(),
  holdDurationMinutes: z.number().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  players: z.number().optional(),
  amountPaise: z.number().optional(),
  paymentMethod: z.string().optional(),
});

function getAdminClient(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): ReturnType<typeof getSupabaseAdmin> {
  try {
    return getSupabaseAdmin();
  } catch {
    return supabase;
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check user authentication
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin authentication required." } },
        { status: 401 },
      );
    }

    // Check admin authorization
    const { data: adminProfile } = await supabase
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const db = getAdminClient(supabase);
    let query = db.from("bookings").select("*").order("created_at", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: { code: "FETCH_FAILED", message: error.message } },
        { status: 400 },
      );
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch bookings." } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check user authentication
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin authentication required." } },
        { status: 401 },
      );
    }

    // Check admin authorization
    const { data: adminProfile } = await supabase
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

    const db = getAdminClient(supabase);
    const body = await request.json();
    const parseResult = adminActionSchema.safeParse(body);

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
      action,
      bookingId,
      bookingDate,
      startHour,
      reason,
      notes,
      customerName,
      customerPhone,
      players,
      amountPaise,
      paymentMethod,
    } = parseResult.data;

    // Helper for audit logging
    async function logAudit(act: string, targetId: string, details: Record<string, unknown>) {
      if (!authData?.user) return;
      await db.from("admin_audit_logs").insert({
        admin_id: authData.user.id,
        admin_email: authData.user.email || authData.user.phone || "admin",
        action: act,
        target_type: "BOOKING",
        target_id: targetId,
        details,
      });
    }

    // Fetch real venue_id from database to avoid foreign key constraints
    let { data: venue } = await db.from("venues").select("id").limit(1).maybeSingle();

    if (!venue) {
      const { data: newVenue } = await db
        .from("venues")
        .insert({
          name: "Gully United XLV",
          address: "SC Boys Residential School Road, Kota",
          phone: "9390817811",
          email: "Gullyunitedxlv@gmail.com",
        })
        .select("id")
        .single();
      venue = newVenue;
    }

    const targetVenueId = venue?.id;

    if (action === "OFFLINE_BOOKING") {
      if (!bookingDate || startHour === undefined || !customerName || !customerPhone) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message:
                "bookingDate, startHour, customerName, and customerPhone are required for offline booking.",
            },
          },
          { status: 400 },
        );
      }

      const ref = `OFFLINE-${Date.now()}`;
      const finalAmountPaise =
        amountPaise !== undefined ? amountPaise : startHour >= 17 ? 49900 : 29900;

      const { data, error } = await db
        .from("bookings")
        .insert({
          venue_id: targetVenueId,
          customer_name: customerName,
          customer_phone: customerPhone,
          phone: customerPhone,
          customer_email: authData.user.email || "admin@gullyunited.com",
          email: authData.user.email || "admin@gullyunited.com",
          booking_date: bookingDate,
          date_key: bookingDate,
          start_hour: startHour,
          end_hour: startHour + 1,
          players: players || 12,
          amount_paise: finalAmountPaise,
          amount: finalAmountPaise / 100,
          status: "CONFIRMED",
          payment_status: "PAID",
          payment_method: paymentMethod || "CASH_COUNTER",
          public_reference: ref,
          reference: ref,
          notes: notes || "Offline Counter Booking",
          idempotency_key: `OFFLINE_${bookingDate}_${startHour}`,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: { code: "BOOKING_FAILED", message: error.message } },
          { status: 400 },
        );
      }

      await logAudit("OFFLINE_BOOKING_CREATED", data.id, {
        customerName,
        customerPhone,
        bookingDate,
        startHour,
      });

      return NextResponse.json({
        message: `Offline booking confirmed for ${customerName} at ${startHour}:00 on ${bookingDate}.`,
        booking: data,
      });
    }

    if (action === "BLOCK_SLOT") {
      if (!bookingDate || startHour === undefined) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "bookingDate and startHour are required to block slot.",
            },
          },
          { status: 400 },
        );
      }

      const ref = `BLOCK-${Date.now()}`;
      const { data, error } = await db
        .from("bookings")
        .insert({
          venue_id: targetVenueId,
          customer_name: customerName || "ADMIN BLOCK",
          customer_phone: customerPhone || authData.user.phone || "+910000000000",
          phone: customerPhone || authData.user.phone || "+910000000000",
          customer_email: authData.user.email || "admin@gullyunited.com",
          email: authData.user.email || "admin@gullyunited.com",
          booking_date: bookingDate,
          date_key: bookingDate,
          start_hour: startHour,
          end_hour: startHour + 1,
          players: 1,
          amount_paise: 0,
          amount: 0,
          status: "BLOCKED",
          public_reference: ref,
          reference: ref,
          notes: reason || "Blocked by Admin",
          idempotency_key: `BLOCK_${bookingDate}_${startHour}_${Date.now()}`,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: { code: "BLOCK_FAILED", message: error.message } },
          { status: 400 },
        );
      }

      await logAudit("SLOT_BLOCKED", data.id, { bookingDate, startHour, reason });

      return NextResponse.json({
        message: `Slot ${startHour}:00 on ${bookingDate} blocked successfully.`,
      });
    }

    if (action === "HOLD_SLOT") {
      if (!bookingDate || startHour === undefined) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "bookingDate and startHour are required to hold slot.",
            },
          },
          { status: 400 },
        );
      }

      const durationMinutes = parseResult.data.holdDurationMinutes || 30;
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      const ref = `HOLD-${Date.now()}`;

      const { data, error } = await db
        .from("bookings")
        .insert({
          venue_id: targetVenueId,
          customer_name: customerName || "ADMIN HOLD",
          customer_phone: customerPhone || authData.user.phone || "+910000000000",
          phone: customerPhone || authData.user.phone || "+910000000000",
          customer_email: authData.user.email || "admin@gullyunited.com",
          email: authData.user.email || "admin@gullyunited.com",
          booking_date: bookingDate,
          date_key: bookingDate,
          start_hour: startHour,
          end_hour: startHour + 1,
          players: players || 12,
          amount_paise: 0,
          amount: 0,
          status: "HOLD",
          payment_status: "UNPAID",
          public_reference: ref,
          reference: ref,
          hold_expires_at: expiresAt,
          expires_at: expiresAt,
          notes: notes || reason || `Admin Hold (${durationMinutes}m)`,
          idempotency_key: `HOLD_${bookingDate}_${startHour}_${Date.now()}`,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: { code: "HOLD_FAILED", message: error.message } },
          { status: 400 },
        );
      }

      await logAudit("SLOT_HELD", data.id, { bookingDate, startHour, durationMinutes, reason });

      return NextResponse.json({
        message: `Slot ${startHour}:00 on ${bookingDate} held for ${durationMinutes} minutes.`,
        booking: data,
      });
    }

    if (action === "CANCEL_BOOKING" || action === "UNBLOCK_SLOT") {
      if (!bookingId) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "bookingId required." } },
          { status: 400 },
        );
      }

      const { error } = await db
        .from("bookings")
        .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (error) {
        return NextResponse.json(
          { error: { code: "CANCEL_FAILED", message: error.message } },
          { status: 400 },
        );
      }

      await logAudit("BOOKING_CANCELLED", bookingId, { reason });

      return NextResponse.json({ message: "Booking cancelled / slot released successfully." });
    }

    if (action === "MARK_COMPLETED") {
      if (!bookingId) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "bookingId required." } },
          { status: 400 },
        );
      }

      const { error } = await db
        .from("bookings")
        .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (error) {
        return NextResponse.json(
          { error: { code: "UPDATE_FAILED", message: error.message } },
          { status: 400 },
        );
      }

      await logAudit("BOOKING_COMPLETED", bookingId, {});

      return NextResponse.json({ message: "Booking marked as COMPLETED." });
    }

    if (action === "START_REFUND") {
      if (!bookingId) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "bookingId required." } },
          { status: 400 },
        );
      }

      const { error } = await db.from("refund_requests").insert({
        booking_id: bookingId,
        amount_paise: amountPaise || 0,
        reason: reason || "Admin Initiated Refund",
        status: "PROCESSED",
        requested_by: authData.user.id,
        processed_by: authData.user.id,
      });

      await db
        .from("bookings")
        .update({ status: "CANCELLED", payment_status: "REFUNDED" })
        .eq("id", bookingId);

      if (error) {
        return NextResponse.json(
          { error: { code: "REFUND_FAILED", message: error.message } },
          { status: 400 },
        );
      }

      await logAudit("REFUND_INITIATED", bookingId, { amountPaise, reason });

      return NextResponse.json({
        message: "Refund initiated and booking status updated to REFUNDED.",
      });
    }

    if (action === "ADD_NOTE") {
      if (!bookingId || !notes) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "bookingId and notes required." } },
          { status: 400 },
        );
      }

      await db.from("bookings").update({ notes }).eq("id", bookingId);
      await logAudit("ADMIN_NOTE_ADDED", bookingId, { notes });

      return NextResponse.json({ message: "Admin note added successfully." });
    }

    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Unknown action." } },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Admin action failed." } },
      { status: 500 },
    );
  }
}
