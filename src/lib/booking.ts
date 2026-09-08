export const OPEN_HOUR = 6;
export const CLOSE_HOUR = 23; // last slot starts at 22:00, ends 23:00
export const MAX_PLAYERS = 16;
export const DAY_RATE = 299;
export const NIGHT_RATE = 499;
export const NIGHT_FROM = 17; // 5 PM
export const ADVANCE_DAYS = 7;

export const VENUE = {
  name: "Gully United XLV",
  tagline: "Sports. Energy. Community.",
  address: "SC Boys Residential School Road, Kota",
  phone: "9390817811",
  phoneIntl: "919390817811",
  email: "Gullyunitedxlv@gmail.com",
  hours: "6:00 AM – 11:00 PM",
};

export const WHATSAPP_URL = `https://wa.me/${VENUE.phoneIntl}?text=${encodeURIComponent(
  "Hi Gully United XLV, I want to book a turf slot.",
)}`;

export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "SC Boys Residential School Road, Kota",
)}`;

export type BookingStatus = "CONFIRMED" | "PENDING" | "CANCELLED" | "BLOCKED";

export interface Booking {
  id: string;
  ref: string;
  name: string;
  phone: string;
  email: string;
  players: number;
  dateKey: string; // yyyy-mm-dd
  hour: number;
  amount: number;
  status: BookingStatus;
  createdAt: string;
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
  return `${hourLabel(hour)} – ${hourLabel(hour + 1)}`;
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
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d);
  return date
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export function isPastSlot(key: string, hour: number, now = new Date()): boolean {
  return key === dateKey(now) && hour <= now.getHours();
}

export function makeRef(): string {
  return `GUXLV-${Math.floor(10000 + Math.random() * 89999)}`;
}

export function isValidPhone(p: string): boolean {
  return /^[6-9]\d{9}$/.test(p.replace(/\D/g, ""));
}

export function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/* ---------- local prototype storage (swap for API later) ---------- */

const KEY = "guxlv.bookings.v1";

export function loadBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

function persist(list: Booking[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("guxlv:bookings"));
}

/**
 * Prototype create. A real backend swap replaces the body with
 * `fetch("/api/bookings", { method: "POST", body: JSON.stringify(input) })`.
 */
export async function createBooking(
  input: Omit<Booking, "id" | "ref" | "status" | "createdAt"> & { status?: BookingStatus },
): Promise<Booking> {
  const list = loadBookings();
  if (list.some((b) => b.dateKey === input.dateKey && b.hour === input.hour && b.status !== "CANCELLED")) {
    throw new Error("SLOT_TAKEN");
  }
  const booking: Booking = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ref: makeRef(),
    status: input.status ?? "CONFIRMED",
    createdAt: new Date().toISOString(),
  };
  persist([...list, booking]);
  return booking;
}

export function updateBooking(id: string, patch: Partial<Booking>) {
  persist(loadBookings().map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

export function removeBooking(id: string) {
  persist(loadBookings().filter((b) => b.id !== id));
}

export function takenHours(key: string, list: Booking[]): number[] {
  return list.filter((b) => b.dateKey === key && b.status !== "CANCELLED").map((b) => b.hour);
}

/* ---------- payment placeholder (Razorpay-ready) ---------- */

export async function createPaymentOrder(_booking: Booking): Promise<{ ready: false }> {
  // Later: POST /api/payments/create-order -> { orderId, amount, currency }
  // then Razorpay checkout -> POST /api/payments/verify
  return { ready: false };
}

export function calendarLink(b: Booking): string {
  const [y, m, d] = b.dateKey.split("-").map(Number);
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const start = `${y}${pad(m)}${pad(d)}T${pad(b.hour)}0000`;
  const end = `${y}${pad(m)}${pad(d)}T${pad(b.hour + 1)}0000`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Gully United XLV — Turf Slot (${b.ref})`,
    dates: `${start}/${end}`,
    details: `${b.players} players · ₹${b.amount}`,
    location: VENUE.address,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
