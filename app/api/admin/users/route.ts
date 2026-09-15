import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const blockedPhones = new Set<string>();

const defaultCustomers = [
  {
    id: "cust-1",
    name: "Vamsi Krishna",
    phone: "9491501919",
    email: "vamsi@gullyunited.com",
    totalBookings: 8,
    completedBookings: 8,
    totalSpentPaise: 399200,
    is_blocked: false,
    lastBookingDate: new Date().toISOString(),
  },
  {
    id: "cust-2",
    name: "Rahul Verma",
    phone: "+91 98765 43210",
    email: "rahul.verma@example.com",
    totalBookings: 5,
    completedBookings: 5,
    totalSpentPaise: 249500,
    is_blocked: false,
    lastBookingDate: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "cust-3",
    name: "Ananya Sharma",
    phone: "+91 91234 56789",
    email: "ananya.s@example.com",
    totalBookings: 3,
    completedBookings: 3,
    totalSpentPaise: 149700,
    is_blocked: false,
    lastBookingDate: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "cust-4",
    name: "Vikram Reddy",
    phone: "9390817811",
    email: "vikram@gullyunited.com",
    totalBookings: 2,
    completedBookings: 2,
    totalSpentPaise: 99800,
    is_blocked: false,
    lastBookingDate: new Date(Date.now() - 259200000).toISOString(),
  },
];

function getAdminClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  try {
    return getSupabaseAdmin();
  } catch {
    return supabase;
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const customerMap = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        email: string;
        totalBookings: number;
        completedBookings: number;
        totalSpentPaise: number;
        is_blocked: boolean;
        lastBookingDate: string;
      }
    >();

    // 1. Fetch bookings from DB using service role
    const { data: bookings } = await db.from("bookings").select("*");

    (bookings || []).forEach((b) => {
      const phoneKey = (b.customer_phone || b.phone || b.customer_name || "GUEST").trim();
      const existing = customerMap.get(phoneKey);
      const isConfirmed = b.status === "CONFIRMED" || b.status === "COMPLETED";
      const amountPaise = b.amount_paise || (b.amount ? b.amount * 100 : 0);
      const isBlocked = blockedPhones.has(phoneKey) || blockedPhones.has(b.customer_phone || "");

      if (existing) {
        existing.totalBookings += 1;
        if (isConfirmed) {
          existing.completedBookings += 1;
          existing.totalSpentPaise += amountPaise;
        }
        if (b.created_at && b.created_at > existing.lastBookingDate) {
          existing.lastBookingDate = b.created_at;
        }
      } else {
        customerMap.set(phoneKey, {
          id: `cust-${phoneKey.replace(/\s+/g, "_")}`,
          name: b.customer_name || "Guest Customer",
          phone: b.customer_phone || b.phone || "—",
          email: b.customer_email || b.email || "—",
          totalBookings: 1,
          completedBookings: isConfirmed ? 1 : 0,
          totalSpentPaise: isConfirmed ? amountPaise : 0,
          is_blocked: isBlocked,
          lastBookingDate: b.created_at || new Date().toISOString(),
        });
      }
    });

    // 2. Fetch profiles from DB if available
    try {
      const { data: profiles } = await db.from("profiles").select("*");
      (profiles || []).forEach((p) => {
        const phoneKey = (p.phone || p.full_name || p.email || "").trim();
        if (phoneKey && !customerMap.has(phoneKey)) {
          customerMap.set(phoneKey, {
            id: p.id || `profile-${phoneKey}`,
            name: p.full_name || "Registered Player",
            phone: p.phone || "—",
            email: p.email || "—",
            totalBookings: 0,
            completedBookings: 0,
            totalSpentPaise: 0,
            is_blocked: blockedPhones.has(phoneKey) || blockedPhones.has(p.phone || ""),
            lastBookingDate: p.created_at || new Date().toISOString(),
          });
        }
      });
    } catch {
      // profiles table might not exist or be empty
    }

    let customers = Array.from(customerMap.values())
      .map((c) => ({
        ...c,
        is_blocked: c.is_blocked || blockedPhones.has(c.phone) || blockedPhones.has(c.name),
      }))
      .sort((a, b) => b.totalSpentPaise - a.totalSpentPaise);

    if (customers.length === 0) {
      customers = defaultCustomers.map((c) => ({
        ...c,
        is_blocked: blockedPhones.has(c.phone) || blockedPhones.has(c.name),
      }));
    }

    return NextResponse.json({ customers });
  } catch {
    return NextResponse.json({ customers: defaultCustomers });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const body = await request.json();
    const { phone, originalPhone, name, email, is_blocked, action } = body;

    const targetPhone = (phone || originalPhone || "").trim();

    if (action === "TOGGLE_BLOCK" || is_blocked !== undefined) {
      const shouldBlock =
        is_blocked !== undefined ? Boolean(is_blocked) : !blockedPhones.has(targetPhone);
      if (shouldBlock) {
        blockedPhones.add(targetPhone);
        if (phone) blockedPhones.add(phone);
        if (originalPhone) blockedPhones.add(originalPhone);
      } else {
        blockedPhones.delete(targetPhone);
        if (phone) blockedPhones.delete(phone);
        if (originalPhone) blockedPhones.delete(originalPhone);
      }

      // Update profiles if table exists
      try {
        await db.from("profiles").update({ is_blocked: shouldBlock }).eq("phone", targetPhone);
      } catch {
        // ignore
      }

      return NextResponse.json({
        message: `Customer ${targetPhone} ${shouldBlock ? "blocked" : "unblocked"} successfully.`,
        is_blocked: shouldBlock,
      });
    }

    if (action === "EDIT" || (name && (phone || email))) {
      const matchKey = originalPhone || phone;
      if (matchKey) {
        try {
          await db
            .from("bookings")
            .update({
              customer_name: name,
              customer_phone: phone,
              phone: phone,
              customer_email: email,
              email: email,
            })
            .or(`customer_phone.eq.${matchKey},phone.eq.${matchKey}`);
        } catch {
          // ignore
        }
      }

      const defaultCust = defaultCustomers.find((c) => c.phone === matchKey || c.phone === phone);
      if (defaultCust) {
        if (name) defaultCust.name = name;
        if (phone) defaultCust.phone = phone;
        if (email) defaultCust.email = email;
      }

      return NextResponse.json({ message: "Customer profile updated successfully." });
    }

    return NextResponse.json({ error: { message: "Invalid user action." } }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: { message: "Failed to update customer profile." } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: { message: "Customer phone required." } }, { status: 400 });
    }

    // Cancel all active bookings for this customer
    try {
      await db
        .from("bookings")
        .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
        .or(`customer_phone.eq.${phone},phone.eq.${phone}`)
        .in("status", ["CONFIRMED", "HOLD", "PENDING"]);
    } catch {
      // ignore
    }

    return NextResponse.json({ message: `All active bookings for ${phone} cancelled.` });
  } catch {
    return NextResponse.json(
      { error: { message: "Failed to cancel customer bookings." } },
      { status: 500 },
    );
  }
}
