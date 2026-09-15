/**
 * Gully United XLV Pure Domain Rules
 * Venue: Kota, Rajasthan
 * All money represented in integer paise (INR 1 = 100 paise)
 */

export const VENUE_RULES = {
  id: "gully-united-xlv-kota",
  name: "Gully United XLV",
  address: "SC Boys Residential School Road, Kota, Nellore, Andhra Pradesh, 524411",
  timezone: "Asia/Kolkata",
  openHour: 6,
  closeHour: 23, // 23:00 (11 PM) - last slot starts at 22:00 (10 PM)
  maxPlayers: 16,
  minPlayers: 1,
  dayRatePaise: 29900, // INR 299.00 before 17:00
  nightRatePaise: 49900, // INR 499.00 from 17:00 onwards
  nightFromHour: 17, // 17:00 (5 PM)
  advanceBookingDays: 7,
  holdDurationMinutes: 10,
} as const;

export interface SlotPriceInfo {
  startHour: number;
  endHour: number;
  amountPaise: number;
  formattedPrice: string;
  isNightRate: boolean;
}

/**
 * Calculates slot price in integer paise for a given start hour.
 */
export function calculateSlotPrice(startHour: number): SlotPriceInfo {
  if (startHour < VENUE_RULES.openHour || startHour >= VENUE_RULES.closeHour) {
    throw new Error(
      `Invalid start hour ${startHour}. Venue operating hours are ${VENUE_RULES.openHour}:00 to ${VENUE_RULES.closeHour}:00.`,
    );
  }

  const isNightRate = startHour >= VENUE_RULES.nightFromHour;
  const amountPaise = isNightRate ? VENUE_RULES.nightRatePaise : VENUE_RULES.dayRatePaise;
  const rupees = amountPaise / 100;

  return {
    startHour,
    endHour: startHour + 1,
    amountPaise,
    formattedPrice: `₹${rupees}`,
    isNightRate,
  };
}

/**
 * Validates whether a booking date is within the allowed 7-day advance booking window.
 */
export function isBookingDateValid(
  bookingDateStr: string,
  currentDateStr?: string,
): { valid: boolean; reason?: string } {
  const today = currentDateStr ? new Date(currentDateStr) : new Date();
  today.setHours(0, 0, 0, 0);

  const bookingDate = new Date(bookingDateStr);
  bookingDate.setHours(0, 0, 0, 0);

  if (isNaN(bookingDate.getTime())) {
    return { valid: false, reason: "Invalid date format." };
  }

  const diffTime = bookingDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { valid: false, reason: "Cannot book slots in the past." };
  }

  if (diffDays >= VENUE_RULES.advanceBookingDays) {
    return {
      valid: false,
      reason: `Bookings can only be made up to ${VENUE_RULES.advanceBookingDays} days in advance.`,
    };
  }

  return { valid: true };
}
