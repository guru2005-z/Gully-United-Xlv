import crypto from "crypto";

export interface CreateRazorpayOrderInput {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderOutput {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Creates a Razorpay Order via REST API using Key ID and Key Secret.
 */
export async function createRazorpayOrder(
  input: CreateRazorpayOrderInput,
): Promise<RazorpayOrderOutput> {
  const keyId = process.env["RAZORPAY_KEY_ID"] || process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];

  if (!keyId || !keySecret) {
    // Development fallback mock order if keys are missing
    console.warn("RAZORPAY_KEY_SECRET missing. Generating development mock order.");
    const mockOrderId = `order_mock_${crypto.randomBytes(8).toString("hex")}`;
    return {
      id: mockOrderId,
      amount: input.amountPaise,
      currency: input.currency || "INR",
      receipt: input.receipt,
      status: "created",
    };
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  let attempts = 0;
  const maxAttempts = 3;
  let lastError: Error | null = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: input.amountPaise,
          currency: input.currency || "INR",
          receipt: input.receipt,
          notes: input.notes ?? {},
          payment_capture: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          id: data.id,
          amount: data.amount,
          currency: data.currency,
          receipt: data.receipt,
          status: data.status,
        };
      }

      const errText = await response.text();
      // Do not retry on 4xx client errors
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Razorpay Order API 4xx Error: ${response.status} ${errText}`);
      }

      lastError = new Error(`Razorpay Order API Error: ${response.status} ${errText}`);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        lastError = new Error("Razorpay Order API request timed out (10s limit).");
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      if (err instanceof Error && err.message.includes("4xx")) throw err;
    }

    if (attempts < maxAttempts) {
      await new Promise((res) => setTimeout(res, Math.pow(2, attempts) * 500));
    }
  }

  throw lastError || new Error("Razorpay Order API creation failed after retries.");
}

/**
 * Validates Razorpay Payment Signature using timing-safe HMAC SHA256 comparison.
 */
export function verifyRazorpayPaymentSignature(input: VerifyPaymentInput): boolean {
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keySecret) {
    if (input.razorpay_order_id.startsWith("order_mock_")) {
      return true;
    }
    return false;
  }

  const body = `${input.razorpay_order_id}|${input.razorpay_payment_id}`;
  const expectedSignature = crypto.createHmac("sha256", keySecret).update(body).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(input.razorpay_signature, "utf8"),
    );
  } catch {
    return false;
  }
}

/**
 * Validates Razorpay Webhook Signature using HMAC SHA256.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret?: string,
): boolean {
  const webhookSecret = secret || process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  } catch {
    return false;
  }
}

/**
 * Initiates a full or partial refund via Razorpay Refunds API POST /v1/payments/{payment_id}/refund
 */
export async function createRazorpayRefund(input: {
  paymentId: string;
  amountPaise: number;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; status: string }> {
  const keyId = process.env["RAZORPAY_KEY_ID"] || process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];

  if (!keyId || !keySecret) {
    return {
      id: `rfnd_mock_${crypto.randomBytes(6).toString("hex")}`,
      amount: input.amountPaise,
      status: "processed",
    };
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const response = await fetch(`https://api.razorpay.com/v1/payments/${input.paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      notes: input.notes ?? {},
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Razorpay Refund API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    amount: data.amount,
    status: data.status,
  };
}

/**
 * Fetches order details from Razorpay for reconciliation
 */
export async function fetchRazorpayOrder(orderId: string): Promise<Record<string, unknown> | null> {
  const keyId = process.env["RAZORPAY_KEY_ID"] || process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keyId || !keySecret) return null;

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: authHeader },
  });

  if (!response.ok) return null;
  return await response.json();
}
