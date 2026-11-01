import { NextResponse } from "next/server";
import { getStoredSettings } from "@/lib/promo-store";

export const dynamic = "force-dynamic";

export interface PaymentGatewayConfig {
  mode: "BOTH" | "UPI_ONLY" | "RAZORPAY_ONLY";
  upiId: string;
  merchantName: string;
  razorpayMeUrl: string;
}

const DEFAULT_PAYMENT_CONFIG: PaymentGatewayConfig = {
  mode: "BOTH",
  upiId: "paytm.s2zq5m0@pty",
  merchantName: "Panabaka Pradeep",
  razorpayMeUrl: "https://razorpay.me/@panabakapradeep",
};

export async function GET() {
  try {
    const settings = await getStoredSettings();
    const raw = settings["PAYMENT_GATEWAY_CONFIG"] as Partial<PaymentGatewayConfig> | undefined;
    const mode =
      raw?.mode === "UPI_ONLY" || raw?.mode === "RAZORPAY_ONLY" || raw?.mode === "BOTH"
        ? raw.mode
        : DEFAULT_PAYMENT_CONFIG.mode;

    return NextResponse.json({
      config: {
        mode,
        upiId: raw?.upiId?.trim() || DEFAULT_PAYMENT_CONFIG.upiId,
        merchantName: raw?.merchantName?.trim() || DEFAULT_PAYMENT_CONFIG.merchantName,
        razorpayMeUrl: raw?.razorpayMeUrl?.trim() || DEFAULT_PAYMENT_CONFIG.razorpayMeUrl,
      },
    });
  } catch {
    return NextResponse.json({ config: DEFAULT_PAYMENT_CONFIG });
  }
}
