import { z } from "zod";

export const BOOKING_RULES = {
  openHour: 6,
  closeHour: 23,
  maxPlayers: 16,
  dayRate: 299,
  nightRate: 499,
  nightFrom: 17,
  advanceDays: 7,
} as const;

export const bookingRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/)),
  email: z.string().trim().email().max(120),
  players: z.number().int().min(1).max(BOOKING_RULES.maxPlayers),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z
    .number()
    .int()
    .min(BOOKING_RULES.openHour)
    .max(BOOKING_RULES.closeHour - 1),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export function priceForHour(hour: number): number {
  return hour >= BOOKING_RULES.nightFrom ? BOOKING_RULES.nightRate : BOOKING_RULES.dayRate;
}

export function isValidDateKey(dateKey: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const [year, month, day] = dateKey.split("-").map(Number);
  const selected = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
  if (
    selected.getUTCFullYear() !== year ||
    selected.getUTCMonth() !== (month ?? 1) - 1 ||
    selected.getUTCDate() !== day
  )
    return false;
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const latest = new Date(today);
  latest.setUTCDate(latest.getUTCDate() + BOOKING_RULES.advanceDays);
  return selected >= today && selected <= latest;
}

export function isValidSlot(dateKey: string, hour: number, now = new Date()): boolean {
  if (!isValidDateKey(dateKey, now)) return false;
  const todayKey = now.toISOString().slice(0, 10);
  return dateKey !== todayKey || hour > now.getHours();
}

export function calculateBookingAmount(hour: number): number {
  if (!Number.isInteger(hour) || hour < BOOKING_RULES.openHour || hour >= BOOKING_RULES.closeHour) {
    throw new Error("INVALID_SLOT");
  }
  return priceForHour(hour);
}
