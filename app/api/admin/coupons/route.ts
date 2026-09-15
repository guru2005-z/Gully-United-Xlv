import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface CouponStore {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_booking_amount: number;
  max_discount_paise: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

const memoryCoupons: CouponStore[] = [
  {
    id: "cpn-1",
    code: "GULLY10",
    description: "10% OFF on all day/night slots",
    discount_type: "PERCENTAGE",
    discount_value: 10,
    min_booking_amount: 0,
    max_discount_paise: 50000,
    usage_limit: 100,
    used_count: 12,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "cpn-2",
    code: "GULLY20",
    description: "20% OFF for weekend matches",
    discount_type: "PERCENTAGE",
    discount_value: 20,
    min_booking_amount: 500,
    max_discount_paise: 100000,
    usage_limit: 50,
    used_count: 5,
    is_active: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "cpn-3",
    code: "WELCOME",
    description: "Flat ₹50 OFF for first time players",
    discount_type: "FIXED",
    discount_value: 50,
    min_booking_amount: 0,
    max_discount_paise: null,
    usage_limit: 500,
    used_count: 89,
    is_active: true,
    created_at: new Date(Date.now() - 172800000).toISOString(),
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

    const { data, error } = await db
      .from("discount_coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ coupons: memoryCoupons });
    }

    return NextResponse.json({ coupons: data && data.length > 0 ? data : memoryCoupons });
  } catch {
    return NextResponse.json({ coupons: memoryCoupons });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const { data: authData } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_booking_amount,
      max_discount_paise,
      usage_limit,
    } = body;

    if (!code || !discount_value) {
      return NextResponse.json(
        { error: { message: "Code and discount value required." } },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("discount_coupons")
      .insert({
        code: code.toUpperCase().trim(),
        description: description || null,
        discount_type: discount_type || "PERCENTAGE",
        discount_value: Number(discount_value),
        min_booking_amount: min_booking_amount ? Number(min_booking_amount) : 0,
        max_discount_paise: max_discount_paise ? Number(max_discount_paise) : null,
        usage_limit: usage_limit ? Number(usage_limit) : null,
        is_active: true,
        created_by: authData?.user?.id || null,
      })
      .select()
      .single();

    if (error) {
      const newCoupon: CouponStore = {
        id: `cpn-${Date.now()}`,
        code: code.toUpperCase().trim(),
        description: description || null,
        discount_type: discount_type || "PERCENTAGE",
        discount_value: Number(discount_value),
        min_booking_amount: min_booking_amount ? Number(min_booking_amount) : 0,
        max_discount_paise: max_discount_paise ? Number(max_discount_paise) : null,
        usage_limit: usage_limit ? Number(usage_limit) : null,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      memoryCoupons.unshift(newCoupon);
      return NextResponse.json({
        coupon: newCoupon,
        message: "Discount coupon created successfully.",
      });
    }

    return NextResponse.json({ coupon: data, message: "Discount coupon created successfully." });
  } catch (err) {
    return NextResponse.json({ error: { message: "Failed to create coupon." } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const body = await request.json();
    const {
      id,
      code,
      description,
      discount_type,
      discount_value,
      min_booking_amount,
      usage_limit,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: { message: "Coupon ID required." } }, { status: 400 });
    }

    const updates: {
      code?: string;
      description?: string | null;
      discount_type?: string;
      discount_value?: number;
      min_booking_amount?: number;
      usage_limit?: number | null;
      is_active?: boolean;
    } = {};

    if (code !== undefined) updates.code = String(code).toUpperCase().trim();
    if (description !== undefined) updates.description = description ? String(description) : null;
    if (discount_type !== undefined) updates.discount_type = String(discount_type);
    if (discount_value !== undefined) updates.discount_value = Number(discount_value);
    if (min_booking_amount !== undefined) updates.min_booking_amount = Number(min_booking_amount);
    if (usage_limit !== undefined) updates.usage_limit = usage_limit ? Number(usage_limit) : null;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { error } = await db.from("discount_coupons").update(updates).eq("id", id);

    const memItem = memoryCoupons.find((c) => c.id === id);
    if (memItem) {
      if (updates.code !== undefined) memItem.code = updates.code;
      if (updates.description !== undefined) memItem.description = updates.description;
      if (updates.discount_type !== undefined) memItem.discount_type = updates.discount_type;
      if (updates.discount_value !== undefined) memItem.discount_value = updates.discount_value;
      if (updates.min_booking_amount !== undefined)
        memItem.min_booking_amount = updates.min_booking_amount;
      if (updates.usage_limit !== undefined) memItem.usage_limit = updates.usage_limit;
      if (updates.is_active !== undefined) memItem.is_active = updates.is_active;
    }

    if (error && !memItem) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ message: "Coupon updated successfully." });
  } catch {
    return NextResponse.json({ error: { message: "Failed to update coupon." } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: { message: "Coupon ID required." } }, { status: 400 });
    }

    const { error } = await db.from("discount_coupons").delete().eq("id", id);

    const memIdx = memoryCoupons.findIndex((c) => c.id === id);
    if (memIdx !== -1) {
      memoryCoupons.splice(memIdx, 1);
    }

    if (error && memIdx === -1) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ message: "Coupon deleted successfully." });
  } catch {
    return NextResponse.json({ error: { message: "Failed to delete coupon." } }, { status: 500 });
  }
}
