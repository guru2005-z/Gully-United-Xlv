import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyRazorpaySignature } from "./razorpay";
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "./adapters/razorpay-adapter";

describe("Razorpay signature verification", () => {
  it("accepts a valid signature and rejects a changed payload", () => {
    const payload = JSON.stringify({ event: "payment.captured" });
    const signature = createHmac("sha256", "test-secret").update(payload).digest("hex");
    expect(verifyRazorpaySignature(payload, signature, "test-secret")).toBe(true);
    expect(verifyRazorpaySignature(`${payload}x`, signature, "test-secret")).toBe(false);
  });

  it("verifies Razorpay checkout callback signature with timing-safe HMAC", () => {
    process.env["RAZORPAY_KEY_SECRET"] = "rzp_live_secret_test_123";
    const orderId = "order_LiveTest123";
    const paymentId = "pay_LiveTest456";
    const validSig = createHmac("sha256", "rzp_live_secret_test_123")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      verifyRazorpayPaymentSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSig,
      }),
    ).toBe(true);

    expect(
      verifyRazorpayPaymentSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_Tampered",
        razorpay_signature: validSig,
      }),
    ).toBe(false);
  });

  it("verifies Razorpay raw-body webhook signature with timing-safe HMAC", () => {
    const rawBody = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 29900 } } },
    });
    const webhookSecret = "whsec_live_test_789";
    const validSig = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

    expect(verifyRazorpayWebhookSignature(rawBody, validSig, webhookSecret)).toBe(true);
    expect(verifyRazorpayWebhookSignature(rawBody, "invalid_sig", webhookSecret)).toBe(false);
  });
});
