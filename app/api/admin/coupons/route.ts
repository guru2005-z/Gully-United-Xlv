import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorizationFailure, requireAdminUser } from "@/lib/admin-auth";
import {
  getStoredAnnouncements,
  getStoredCoupons,
  saveStoredAnnouncements,
  saveStoredCoupons,
  type CouponRecord,
} from "@/lib/promo-store";

export const dynamic = "force-dynamic";

function getAdminClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  try {
    return getSupabaseAdmin();
  } catch {
    return supabase;
  }
}

export async function GET() {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;

    const coupons = await getStoredCoupons();
    return NextResponse.json({ coupons });
  } catch {
    const coupons = await getStoredCoupons();
    return NextResponse.json({ coupons });
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;
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

    const cleanCode = String(code).toUpperCase().trim();
    const coupons = await getStoredCoupons();

    const newCoupon: CouponRecord = {
      id: `cpn-${Date.now()}`,
      code: cleanCode,
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

    const { data, error } = await db
      .from("discount_coupons")
      .insert({
        code: cleanCode,
        description: newCoupon.description,
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        min_booking_amount: newCoupon.min_booking_amount,
        max_discount_paise: newCoupon.max_discount_paise,
        usage_limit: newCoupon.usage_limit,
        is_active: true,
        created_by: authData?.user?.id || null,
      })
      .select()
      .single();

    const savedCoupon = !error && data ? (data as CouponRecord) : newCoupon;
    const updatedCoupons = [
      savedCoupon,
      ...coupons.filter((c) => c.code.toUpperCase() !== cleanCode),
    ];
    await saveStoredCoupons(updatedCoupons);

    return NextResponse.json({
      coupon: savedCoupon,
      message: "Discount coupon created successfully.",
    });
  } catch {
    return NextResponse.json({ error: { message: "Failed to create coupon." } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;
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

    await db.from("discount_coupons").update(updates).eq("id", id);

    const coupons = await getStoredCoupons();
    let targetCode = "";
    const updatedCoupons = coupons.map((c) => {
      if (c.id === id) {
        targetCode = (updates.code || c.code).toUpperCase().trim();
        return {
          ...c,
          ...(updates.code !== undefined ? { code: updates.code } : {}),
          ...(updates.description !== undefined ? { description: updates.description } : {}),
          ...(updates.discount_type !== undefined ? { discount_type: updates.discount_type } : {}),
          ...(updates.discount_value !== undefined
            ? { discount_value: updates.discount_value }
            : {}),
          ...(updates.min_booking_amount !== undefined
            ? { min_booking_amount: updates.min_booking_amount }
            : {}),
          ...(updates.usage_limit !== undefined ? { usage_limit: updates.usage_limit } : {}),
          ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
        };
      }
      return c;
    });

    await saveStoredCoupons(updatedCoupons);

    // Sync any announcement banner referencing this coupon code when paused or activated
    if (targetCode && updates.is_active !== undefined) {
      const announcements = await getStoredAnnouncements();
      const codeRegex = new RegExp(`\\b${targetCode}\\b`, "i");
      let changed = false;
      const updatedAnnouncements = announcements.map((ann) => {
        if (codeRegex.test(`${ann.title} ${ann.message}`)) {
          changed = true;
          return { ...ann, is_active: Boolean(updates.is_active) };
        }
        return ann;
      });
      if (changed) {
        await saveStoredAnnouncements(updatedAnnouncements);
      }
    }

    return NextResponse.json({ message: "Coupon updated successfully." });
  } catch {
    return NextResponse.json({ error: { message: "Failed to update coupon." } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authorization = await requireAdminUser();
    if (isAdminAuthorizationFailure(authorization)) return authorization;
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: { message: "Coupon ID required." } }, { status: 400 });
    }

    await db.from("discount_coupons").delete().eq("id", id);

    const coupons = await getStoredCoupons();
    const deletedCoupon = coupons.find((c) => c.id === id);
    const updatedCoupons = coupons.filter((c) => c.id !== id);
    await saveStoredCoupons(updatedCoupons);

    // Also deactivate any announcement banner referencing the deleted coupon code
    if (deletedCoupon) {
      const codeRegex = new RegExp(`\\b${deletedCoupon.code.toUpperCase().trim()}\\b`, "i");
      const announcements = await getStoredAnnouncements();
      let changed = false;
      const updatedAnnouncements = announcements.map((ann) => {
        if (codeRegex.test(`${ann.title} ${ann.message}`) && ann.is_active) {
          changed = true;
          return { ...ann, is_active: false };
        }
        return ann;
      });
      if (changed) {
        await saveStoredAnnouncements(updatedAnnouncements);
      }
    }

    return NextResponse.json({ message: "Coupon deleted successfully." });
  } catch {
    return NextResponse.json({ error: { message: "Failed to delete coupon." } }, { status: 500 });
  }
}
