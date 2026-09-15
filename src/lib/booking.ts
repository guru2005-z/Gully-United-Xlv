import { z } from "zod";

export const OPEN_HOUR = 6;
export const CLOSE_HOUR = 23;
export const MAX_PLAYERS = 16;
export const DAY_RATE = 299;
export const NIGHT_RATE = 499;
export const NIGHT_FROM = 17;
export const ADVANCE_DAYS = 7;

export const VENUE = {
  name: "Gully United XLV",
  tagline: "Sports. Energy. Community.",
  address: "SC Boys Residential School Road, Kota, Nellore, Andhra Pradesh, 524411",
  phone: "9390817811",
  phoneIntl: "919390817811",
  email: "Gullyunitedxlv@gmail.com",
  hours: "6:00 AM - 11:00 PM",
};

export const WHATSAPP_URL = `https://wa.me/${VENUE.phoneIntl}?text=${encodeURIComponent(
  "Hi Gully United XLV, I want to book a turf slot.",
)}`;

export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "SC Boys Residential School Road, Kota, Nellore, Andhra Pradesh, 524411",
)}`;

export type BookingStatus =
  "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW" | "BLOCKED";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

export interface Booking {
  id: string;
  ref: string;
  name: string;
  phone: string;
  email: string;
  players: number;
  dateKey: string;
  hour: number;
  amount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
}

export const bookingInputSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80),
    phone: z
      .string()
      .transform((value) => value.replace(/\D/g, ""))
      .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid Indian 10-digit phone number.")),
    email: z.string().trim().email("Enter a valid email address.").max(120),
    players: z.number().int().min(1).max(MAX_PLAYERS),
    dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hour: z
      .number()
      .int()
      .min(OPEN_HOUR)
      .max(CLOSE_HOUR - 1),
  })
  .superRefine((value, ctx) => {
    const selected = new Date(`${value.dateKey}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const latest = new Date(today);
    latest.setDate(today.getDate() + ADVANCE_DAYS);
    if (Number.isNaN(selected.getTime()) || selected < today || selected > latest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateKey"],
        message: `Choose a date within the next ${ADVANCE_DAYS} days.`,
      });
    }
  });

export type BookingInput = z.input<typeof bookingInputSchema>;

let memoryBookings: Booking[] = [];

function readBookings(): Booking[] {
  return memoryBookings;
}

function writeBookings(bookings: Booking[]) {
  memoryBookings = bookings;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("guxlv:bookings"));
  }
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newReference() {
  return `GU-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function priceForHour(hour: number): number {
  return hour >= NIGHT_FROM ? NIGHT_RATE : DAY_RATE;
}

export function hourLabel(hour: number): string {
  const h24 = ((hour % 24) + 24) % 24;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:00 ${suffix}`;
}

export function slotLabel(hour: number): string {
  return `${hourLabel(hour)} - ${hourLabel(hour + 1)}`;
}

export function allHours(): number[] {
  const out: number[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) out.push(h);
  return out;
}

export function dateKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function bookableDays(from = new Date()): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < ADVANCE_DAYS; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

export function prettyDate(key: string): string {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export function isPastSlot(key: string, hour: number, now = new Date()): boolean {
  return key === dateKey(now) && hour <= now.getHours();
}

export function isValidPhone(p: string): boolean {
  return /^[6-9]\d{9}$/.test(p.replace(/\D/g, ""));
}

export function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function takenHours(key: string, list: Booking[]): number[] {
  return list.filter((b) => b.dateKey === key && b.status !== "CANCELLED").map((b) => b.hour);
}

export async function loadBookings(range?: { from: string; to: string }): Promise<Booking[]> {
  const from = range?.from ?? dateKey(new Date());
  const to = range?.to ?? dateKey(new Date(Date.now() + ADVANCE_DAYS * 24 * 60 * 60 * 1000));

  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/availability?date=${from}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.hours)) {
          const unavailableHours: number[] = data.hours
            .filter((h: { hour: number; available: boolean }) => !h.available)
            .map((h: { hour: number; available: boolean }) => h.hour);

          const existing = readBookings();
          const merged = [...existing];
          for (const hour of unavailableHours) {
            if (!merged.some((b) => b.dateKey === from && b.hour === hour)) {
              merged.push({
                id: `remote-${from}-${hour}`,
                ref: "BOOKED",
                name: "Booked Slot",
                phone: "",
                email: "",
                players: 0,
                dateKey: from,
                hour,
                amount: priceForHour(hour),
                status: "CONFIRMED",
                paymentStatus: "PAID",
                paymentMethod: null,
                notes: null,
                createdAt: new Date().toISOString(),
              });
            }
          }
          memoryBookings = merged;
        }
      }
    } catch {
      // Fallback to local memory bookings if backend API is offline
    }
  }

  return readBookings()
    .filter((booking) => booking.dateKey >= from && booking.dateKey <= to)
    .sort((a, b) => `${a.dateKey}${a.hour}`.localeCompare(`${b.dateKey}${b.hour}`));
}

export async function createBooking(
  input: BookingInput,
  idempotencyKey?: string,
): Promise<Booking> {
  const parsed = bookingInputSchema.parse(input);
  const requestKey = idempotencyKey ?? newId();

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": requestKey,
        },
        body: JSON.stringify(parsed),
      });

      if (res.status === 409) {
        throw new Error("SLOT_TAKEN");
      }

      if (res.ok) {
        const body = await res.json();
        if (body.booking) {
          const b: Booking = {
            id: body.booking.id,
            ref: body.booking.reference,
            name: body.booking.customer_name,
            phone: body.booking.phone,
            email: body.booking.email,
            players: body.booking.players,
            dateKey: body.booking.date_key,
            hour: body.booking.start_hour,
            amount: body.booking.amount,
            status: body.booking.status,
            paymentStatus: body.booking.payment_status,
            paymentMethod: body.booking.payment_method ?? "pay_at_venue",
            notes: body.booking.notes ?? null,
            createdAt: body.booking.created_at,
          };
          const existing = readBookings();
          writeBookings([...existing.filter((x) => x.id !== b.id), b]);
          return b;
        }
      }
    } catch (err) {
      if ((err as Error).message === "SLOT_TAKEN") throw err;
      // Fallback to in-browser creation if backend is in fallback mode
    }
  }

  const existing = readBookings();
  const repeat = existing.find((booking) => booking.id === requestKey);
  if (repeat) return repeat;
  if (
    existing.some(
      (booking) =>
        booking.dateKey === parsed.dateKey &&
        booking.hour === parsed.hour &&
        booking.status !== "CANCELLED",
    )
  ) {
    throw new Error("SLOT_TAKEN");
  }
  const booking: Booking = {
    id: requestKey,
    ref: newReference(),
    name: parsed.name,
    phone: parsed.phone,
    email: parsed.email,
    players: parsed.players,
    dateKey: parsed.dateKey,
    hour: parsed.hour,
    amount: priceForHour(parsed.hour),
    status: "PENDING",
    paymentStatus: "UNPAID",
    paymentMethod: "pay_at_venue",
    notes: null,
    createdAt: new Date().toISOString(),
  };
  writeBookings([...existing, booking]);
  return booking;
}

export async function updateBooking(id: string, patch: Partial<Booking>) {
  const updated = readBookings().map((booking) =>
    booking.id === id ? { ...booking, ...patch, updatedAt: new Date().toISOString() } : booking,
  );
  writeBookings(updated);
}

export async function removeBooking(id: string) {
  await updateBooking(id, { status: "CANCELLED" });
}

export async function blockSlot(input: { dateKey: string; hour: number; reason?: string }) {
  const existing = readBookings();
  if (
    existing.some(
      (booking) =>
        booking.dateKey === input.dateKey &&
        booking.hour === input.hour &&
        booking.status !== "CANCELLED",
    )
  ) {
    throw new Error("SLOT_TAKEN");
  }
  writeBookings([
    ...existing,
    {
      id: newId(),
      ref: "BLOCKED",
      name: "Venue block",
      phone: "",
      email: "",
      players: 0,
      dateKey: input.dateKey,
      hour: input.hour,
      amount: 0,
      status: "BLOCKED",
      paymentStatus: "UNPAID",
      paymentMethod: null,
      notes: input.reason ?? "Blocked by venue",
      createdAt: new Date().toISOString(),
    },
  ]);
}

export async function createPaymentOrder(_booking: Booking): Promise<{ ready: false }> {
  return { ready: false };
}

export function calendarLink(b: Booking): string {
  const [y = 0, m = 1, d = 1] = b.dateKey.split("-").map(Number);
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const start = `${y}${pad(m)}${pad(d)}T${pad(b.hour)}0000`;
  const end = `${y}${pad(m)}${pad(d)}T${pad(b.hour + 1)}0000`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Gully United XLV - Turf Slot (${b.ref})`,
    dates: `${start}/${end}`,
    details: `${b.players} players · Rs ${b.amount} due at venue`,
    location: VENUE.address,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
