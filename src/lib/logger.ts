/**
 * Structured JSON Logger with PII & Secret Redaction
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

const REDACT_KEYS = new Set([
  "phone",
  "email",
  "customer_phone",
  "customer_email",
  "razorpay_signature",
  "signature",
  "secret",
  "key",
  "token",
  "authorization",
]);

function redactObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactObject(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

export function logEvent(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  requestId?: string,
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: requestId ?? "none",
    meta: meta ? redactObject(meta) : undefined,
  };

  const output = JSON.stringify(payload);
  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "info":
    default:
      console.log(output);
      break;
  }
}
