import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "./razorpay-adapter";

describe("Razorpay HMAC Signature Verification", () => {
  const secret = "test_secret_key_123";

  it("verifies valid payment signature timing-safely", () => {
    process.env["RAZORPAY_KEY_SECRET"] = secret;
    const orderId = "order_9A33XWu170gUtm";
    const paymentId = "pay_29A33XWu170gUtm";

    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    const result = verifyRazorpayPaymentSignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
    });

    expect(result).toBe(true);
  });

  it("rejects invalid payment signature", () => {
    process.env["RAZORPAY_KEY_SECRET"] = secret;
    const result = verifyRazorpayPaymentSignature({
      razorpay_order_id: "order_123",
      razorpay_payment_id: "pay_123",
      razorpay_signature: "invalid_sig_abc",
    });

    expect(result).toBe(false);
  });

  it("verifies valid webhook signature", () => {
    const rawBody = JSON.stringify({ event: "payment.captured", entity: "event" });
    const validSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    const result = verifyRazorpayWebhookSignature(rawBody, validSignature, secret);
    expect(result).toBe(true);
  });
});
