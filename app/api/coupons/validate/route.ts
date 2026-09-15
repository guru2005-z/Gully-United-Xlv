import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_COUPONS: Record<
  string,
  { type: "PERCENTAGE" | "FIXED"; value: number; maxDiscountPaise?: number }
> = {
  GULLY10: { type: "PERCENTAGE", value: 10, maxDiscountPaise: 50000 },
  GULLY20: { type: "PERCENTAGE", value: 20, maxDiscountPaise: 100000 },
  WELCOME: { type: "FIXED", value: 50 },
  NIGHT10: { type: "PERCENTAGE", value: 10, maxDiscountPaise: 50000 },
};

function getAdminClient(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  try {
    return getSupabaseAdmin();
  } catch {
    return supabase;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const db = getAdminClient(supabase);
    const body = await request.json();
    const { code, amountPaise } = body;

    if (!code) {
      return NextResponse.json({ error: { message: "Coupon code is required." } }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();
    const bookingAmountPaise = amountPaise || 29900;

    // Try DB lookup
    const { data: coupon } = await db
      .from("discount_coupons")
      .select("*")
      .eq("code", cleanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (coupon) {
      if (
        coupon.usage_limit !== null &&
        coupon.usage_limit !== undefined &&
        (coupon.used_count || 0) >= coupon.usage_limit
      ) {
        return NextResponse.json(
          {
            error: {
              message: `Coupon code '${coupon.code}' has reached its maximum usage limit of ${coupon.usage_limit} redemptions.`,
            },
          },
          { status: 400 },
        );
      }

      if (coupon.min_booking_amount && bookingAmountPaise < coupon.min_booking_amount * 100) {
        return NextResponse.json(
          {
            error: {
              message: `Coupon requires minimum booking amount of ₹${coupon.min_booking_amount}.`,
            },
          },
          { status: 400 },
        );
      }

      let discountPaise = 0;
      if (coupon.discount_type === "PERCENTAGE") {
        discountPaise = Math.round((bookingAmountPaise * coupon.discount_value) / 100);
        if (coupon.max_discount_paise && discountPaise > coupon.max_discount_paise) {
          discountPaise = coupon.max_discount_paise;
        }
      } else {
        discountPaise = coupon.discount_value * 100;
      }

      if (discountPaise > bookingAmountPaise) {
        discountPaise = bookingAmountPaise;
      }

      return NextResponse.json({
        valid: true,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountPaise,
        discountAmountRupees: discountPaise / 100,
        finalAmountPaise: bookingAmountPaise - discountPaise,
        message: `Promo code ${coupon.code} applied! Saved ₹${discountPaise / 100}.`,
      });
    }

    // Check default fallbacks
    const fallback = DEFAULT_COUPONS[cleanCode];
    if (fallback) {
      let discountPaise = 0;
      if (fallback.type === "PERCENTAGE") {
        discountPaise = Math.round((bookingAmountPaise * fallback.value) / 100);
        if (fallback.maxDiscountPaise && discountPaise > fallback.maxDiscountPaise) {
          discountPaise = fallback.maxDiscountPaise;
        }
      } else {
        discountPaise = fallback.value * 100;
      }

      if (discountPaise > bookingAmountPaise) {
        discountPaise = bookingAmountPaise;
      }

      return NextResponse.json({
        valid: true,
        code: cleanCode,
        discountType: fallback.type,
        discountValue: fallback.value,
        discountPaise,
        discountAmountRupees: discountPaise / 100,
        finalAmountPaise: bookingAmountPaise - discountPaise,
        message: `Promo code ${cleanCode} applied! Saved ₹${discountPaise / 100}.`,
      });
    }

    return NextResponse.json(
      { error: { message: `Invalid code '${cleanCode}'. Try GULLY10 for 10% OFF.` } },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: { message: "Failed to validate promo code." } },
      { status: 500 },
    );
  }
}
