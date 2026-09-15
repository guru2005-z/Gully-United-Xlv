import { describe, it, expect } from "vitest";
import { calculateSlotPrice, isBookingDateValid, VENUE_RULES } from "./venue";
import { validateBookingTransition, isStatusActive } from "./booking-state";

describe("Venue Pure Domain Rules", () => {
  it("calculates day rate correctly in paise (INR 299 = 29900 paise)", () => {
    const slot = calculateSlotPrice(10); // 10:00 AM
    expect(slot.amountPaise).toBe(29900);
    expect(slot.formattedPrice).toBe("₹299");
    expect(slot.isNightRate).toBe(false);
  });

  it("calculates night rate correctly in paise (INR 499 = 49900 paise)", () => {
    const slot = calculateSlotPrice(18); // 6:00 PM (>= 17:00)
    expect(slot.amountPaise).toBe(49900);
    expect(slot.formattedPrice).toBe("₹499");
    expect(slot.isNightRate).toBe(true);
  });

  it("throws error for hours outside operating schedule", () => {
    expect(() => calculateSlotPrice(5)).toThrow();
    expect(() => calculateSlotPrice(23)).toThrow();
  });

  it("validates 7-day advance booking window", () => {
    const today = "2026-09-13";
    expect(isBookingDateValid("2026-09-13", today).valid).toBe(true);
    expect(isBookingDateValid("2026-09-19", today).valid).toBe(true);
    expect(isBookingDateValid("2026-09-20", today).valid).toBe(false); // 7 days ahead
    expect(isBookingDateValid("2026-09-12", today).valid).toBe(false); // Past date
  });
});

describe("Booking State Machine", () => {
  it("allows legal transitions", () => {
    expect(validateBookingTransition("HOLD", "PAYMENT_PENDING").allowed).toBe(true);
    expect(validateBookingTransition("PAYMENT_PENDING", "CONFIRMED").allowed).toBe(true);
    expect(validateBookingTransition("CONFIRMED", "CANCELLED").allowed).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(validateBookingTransition("CANCELLED", "CONFIRMED").allowed).toBe(false);
    expect(validateBookingTransition("EXPIRED", "PAID").allowed).toBe(false);
  });

  it("identifies active vs released slot statuses", () => {
    expect(isStatusActive("HOLD")).toBe(true);
    expect(isStatusActive("CONFIRMED")).toBe(true);
    expect(isStatusActive("CANCELLED")).toBe(false);
    expect(isStatusActive("EXPIRED")).toBe(false);
  });
});
