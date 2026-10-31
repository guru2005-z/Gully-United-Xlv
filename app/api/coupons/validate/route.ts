import { NextResponse } from "next/server";
import { getStoredCoupons } from "@/lib/promo-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, amountPaise } = body;

    if (!code) {
      return NextResponse.json({ error: { message: "Coupon code is required." } }, { status: 400 });
    }

    const cleanCode = String(code).toUpperCase().trim();
    const bookingAmountPaise = amountPaise || 29900;

    const coupons = await getStoredCoupons();
    const matchedCoupon = coupons.find((c) => c.code.toUpperCase().trim() === cleanCode);

    if (!matchedCoupon) {
      return NextResponse.json(
        { error: { message: `Invalid or expired promo code '${cleanCode}'.` } },
        { status: 400 },
      );
    }

    if (!matchedCoupon.is_active) {
      return NextResponse.json(
        { error: { message: `Promo code '${cleanCode}' is currently paused and unavailable.` } },
        { status: 400 },
      );
    }

    if (
      matchedCoupon.usage_limit !== null &&
      matchedCoupon.usage_limit !== undefined &&
      (matchedCoupon.used_count || 0) >= matchedCoupon.usage_limit
    ) {
      return NextResponse.json(
        {
          error: {
            message: `Coupon code '${matchedCoupon.code}' has reached its maximum usage limit of ${matchedCoupon.usage_limit} redemptions.`,
          },
        },
        { status: 400 },
      );
    }

    if (
      matchedCoupon.min_booking_amount &&
      bookingAmountPaise < matchedCoupon.min_booking_amount * 100
    ) {
      return NextResponse.json(
        {
          error: {
            message: `Coupon requires minimum booking amount of ₹${matchedCoupon.min_booking_amount}.`,
          },
        },
        { status: 400 },
      );
    }

    let discountPaise = 0;
    if (matchedCoupon.discount_type === "PERCENTAGE") {
      discountPaise = Math.round((bookingAmountPaise * matchedCoupon.discount_value) / 100);
      if (matchedCoupon.max_discount_paise && discountPaise > matchedCoupon.max_discount_paise) {
        discountPaise = matchedCoupon.max_discount_paise;
      }
    } else {
      discountPaise = matchedCoupon.discount_value * 100;
    }

    if (discountPaise > bookingAmountPaise) {
      discountPaise = bookingAmountPaise;
    }

    return NextResponse.json({
      valid: true,
      code: matchedCoupon.code,
      discountType: matchedCoupon.discount_type,
      discountValue: matchedCoupon.discount_value,
      discountPaise,
      discountAmountRupees: discountPaise / 100,
      finalAmountPaise: bookingAmountPaise - discountPaise,
      message: `Promo code ${matchedCoupon.code} applied! Saved ₹${discountPaise / 100}.`,
    });
  } catch {
    return NextResponse.json(
      { error: { message: "Failed to validate promo code." } },
      { status: 500 },
    );
  }
}
