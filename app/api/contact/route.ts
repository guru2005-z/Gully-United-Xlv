import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  phone: z.string().trim().min(10, "Phone number is required.").max(15),
  email: z.string().trim().email("Valid email required.").optional().or(z.literal("")),
  message: z.string().trim().min(5, "Message must be at least 5 characters.").max(1000),
  website: z.string().optional(), // Spam Honeypot Field
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    // 1. Rate Limit: Max 5 contact submissions per 10 minutes per IP
    const rateCheck = await checkRateLimit(`contact:${ip}`, 5, 600);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many messages sent. Please wait 10 minutes before submitting again.",
          },
        },
        { status: 429 },
      );
    }

    const body = await request.json();

    // 2. Spam Honeypot Protection: If hidden field 'website' is filled, silently reject spam
    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ message: "Message received successfully." }, { status: 200 });
    }

    const parseResult = contactSchema.safeParse(body);
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

    const { name, phone, email, message } = parseResult.data;
    const db = getSupabaseAdmin();

    // 3. Insert into contact_messages
    const { error: dbErr } = await db.from("contact_messages").insert({
      name,
      phone,
      email: email || null,
      message,
      status: "unread",
      created_at: new Date().toISOString(),
    });

    if (dbErr) {
      return NextResponse.json(
        { error: { code: "MESSAGE_SAVE_FAILED", message: "Failed to save message." } },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Thank you! Your message has been received." },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to submit contact message." } },
      { status: 500 },
    );
  }
}
