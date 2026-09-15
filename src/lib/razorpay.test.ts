import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyRazorpaySignature } from "./razorpay";

describe("Razorpay signature verification", () => {
  it("accepts a valid signature and rejects a changed payload", () => {
    const payload = JSON.stringify({ event: "payment.captured" });
    const signature = createHmac("sha256", "test-secret").update(payload).digest("hex");
    expect(verifyRazorpaySignature(payload, signature, "test-secret")).toBe(true);
    expect(verifyRazorpaySignature(`${payload}x`, signature, "test-secret")).toBe(false);
  });
});
