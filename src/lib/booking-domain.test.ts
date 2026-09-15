import { describe, expect, it } from "vitest";
import {
  BOOKING_RULES,
  bookingRequestSchema,
  isValidDateKey,
  isValidSlot,
  priceForHour,
} from "./booking-domain";

describe("booking domain", () => {
  const now = new Date("2026-09-13T12:00:00");

  it("uses day and night rates", () => {
    expect(priceForHour(16)).toBe(BOOKING_RULES.dayRate);
    expect(priceForHour(17)).toBe(BOOKING_RULES.nightRate);
  });

  it("accepts only the seven-day date window", () => {
    expect(isValidDateKey("2026-09-13", now)).toBe(true);
    expect(isValidDateKey("2026-09-20", now)).toBe(true);
    expect(isValidDateKey("2026-09-21", now)).toBe(false);
    expect(isValidDateKey("2026-02-31", now)).toBe(false);
  });

  it("rejects past and out-of-hours slots", () => {
    expect(isValidSlot("2026-09-13", 11, now)).toBe(false);
    expect(isValidSlot("2026-09-14", 6, now)).toBe(true);
    expect(
      bookingRequestSchema.safeParse({
        name: "A Player",
        phone: "9390817811",
        email: "a@example.com",
        players: 17,
        dateKey: "2026-09-14",
        hour: 6,
      }).success,
    ).toBe(false);
  });
});
