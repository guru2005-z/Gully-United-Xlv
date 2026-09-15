/**
 * Booking State Machine & Legal Transition Functions
 */

export type BookingStatus =
  | "HOLD"
  | "PAYMENT_PENDING"
  | "PAID"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED"
  | "BLOCKED";

export type PaymentStatus = "PENDING" | "CAPTURED" | "FAILED" | "REFUND_PENDING" | "REFUNDED";

export interface BookingStateTransitionResult {
  allowed: boolean;
  from: BookingStatus;
  to: BookingStatus;
  reason?: string;
}

/**
 * Active statuses that reserve/lock a slot in database queries & partial index.
 */
export const ACTIVE_SLOT_STATUSES: readonly BookingStatus[] = [
  "HOLD",
  "PAYMENT_PENDING",
  "PAID",
  "CONFIRMED",
  "BLOCKED",
] as const;

/**
 * Statuses that release slot availability back to the pool.
 */
export const RELEASED_SLOT_STATUSES: readonly BookingStatus[] = [
  "CANCELLED",
  "EXPIRED",
  "FAILED",
] as const;

const LEGAL_BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  HOLD: ["PAYMENT_PENDING", "CONFIRMED", "EXPIRED", "FAILED", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "CONFIRMED", "FAILED", "EXPIRED", "CANCELLED"],
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [], // Terminal state
  EXPIRED: [], // Terminal state
  FAILED: ["HOLD"], // Retry allowed via new hold
  BLOCKED: ["CANCELLED", "EXPIRED"], // Admin can unblock by cancelling/expiring block
};

/**
 * Enforces legal state machine transitions for bookings.
 */
export function validateBookingTransition(
  from: BookingStatus,
  to: BookingStatus,
): BookingStateTransitionResult {
  if (from === to) {
    return { allowed: true, from, to };
  }

  const allowedNext = LEGAL_BOOKING_TRANSITIONS[from] || [];
  if (!allowedNext.includes(to)) {
    return {
      allowed: false,
      from,
      to,
      reason: `Illegal booking status transition from '${from}' to '${to}'.`,
    };
  }

  return { allowed: true, from, to };
}

/**
 * Determines whether a slot is currently locked by a given status.
 */
export function isStatusActive(status: BookingStatus): boolean {
  return ACTIVE_SLOT_STATUSES.includes(status);
}
