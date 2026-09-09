import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, Clock, Minus, Plus, ShieldCheck, Users, X } from "lucide-react";
import pattern from "@/assets/pattern.asset.json";
import {
  MAX_PLAYERS,
  VENUE,
  WHATSAPP_URL,
  allHours,
  bookableDays,
  calendarLink,
  createBooking,
  dateKey,
  hourLabel,
  isPastSlot,
  isValidEmail,
  isValidPhone,
  loadBookings,
  prettyDate,
  priceForHour,
  slotLabel,
  takenHours,
  type Booking,
} from "@/lib/booking";

const STEPS = ["Date", "Time", "Players", "Details"] as const;

export function BookingWidget() {
  const days = useMemo(() => bookableDays(), []);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [hour, setHour] = useState<number | null>(null);
  const [players, setPlayers] = useState(10);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [booked, setBooked] = useState<Booking | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<Booking[]>([]);

  useEffect(() => {
    const sync = () => setExisting(loadBookings());
    sync();
    window.addEventListener("guxlv:bookings", sync);
    return () => window.removeEventListener("guxlv:bookings", sync);
  }, []);

  const taken = takenHours(selectedDate, existing);
  const price = hour === null ? null : priceForHour(hour);
  const availableCount = allHours().filter(
    (h) => !taken.includes(h) && !isPastSlot(selectedDate, h),
  ).length;

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Enter your name.";
    if (!isValidPhone(form.phone)) e.phone = "Enter a valid phone number.";
    if (!isValidEmail(form.email)) e.email = "Enter a valid email address.";
    if (players < 1 || players > MAX_PLAYERS) e.players = `Maximum ${MAX_PLAYERS} players per booking.`;
    if (hour === null) e.hour = "Select a time slot.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function confirm() {
    if (!validate() || hour === null) return;
    setSubmitting(true);
    try {
      const b = await createBooking({
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ""),
        email: form.email.trim(),
        players,
        dateKey: selectedDate,
        hour,
        amount: priceForHour(hour),
      });
      setBooked(b);
      window.scrollTo({ top: window.scrollY - 80, behavior: "smooth" });
    } catch (err) {
      setErrors({
        form: (err as Error).message === "SLOT_TAKEN" ? "This slot is taken. Try another time." : "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (booked) return <Confirmation booking={booked} onReset={() => setBooked(null)} />;

  return (
    <div className="panel relative overflow-hidden p-5 sm:p-8">
      <img
        src={pattern.url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={720}
        height={1280}
        className="pointer-events-none absolute -right-32 -top-32 w-[420px] opacity-[0.06]"
      />
      <div className="relative">
        <ol className="mb-8 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="min-w-0">
              <span className="block text-[0.65rem] font-extrabold tracking-[0.2em] text-primary">
                0{i + 1}
              </span>
              <span className="mt-1 block truncate text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {s}
              </span>
              <span className="mt-2 block h-0.5 w-full bg-border">
                <span
                  className="block h-full bg-primary transition-all duration-500"
                  style={{
                    width:
                      (i === 0 && selectedDate) ||
                      (i === 1 && hour !== null) ||
                      (i === 2 && players > 0) ||
                      (i === 3 && form.name && form.phone && form.email)
                        ? "100%"
                        : "0%",
                  }}
                />
              </span>
            </li>
          ))}
        </ol>

        {/* Step 1 — date */}
        <fieldset>
          <legend className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.2em]">
            <CalendarDays size={16} className="text-primary" /> Select date
          </legend>
          <p className="mt-1 text-xs text-muted-foreground">Bookings open up to 7 days in advance.</p>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {days.map((d) => {
              const key = dateKey(d);
              const active = key === selectedDate;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(key);
                    setHour(null);
                  }}
                  aria-pressed={active}
                  className={`rounded-lg border px-2 py-3 text-center transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-black/40 text-foreground hover:border-primary/60"
                  }`}
                >
                  <span className="block text-[0.6rem] font-bold uppercase tracking-[0.14em] opacity-80">
                    {d.toLocaleDateString("en-IN", { weekday: "short" })}
                  </span>
                  <span className="display block text-xl">{d.getDate()}</span>
                  <span className="block text-[0.6rem] uppercase opacity-80">
                    {d.toLocaleDateString("en-IN", { month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Step 2 — time */}
        <fieldset className="mt-8">
          <legend className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.2em]">
            <Clock size={16} className="text-primary" /> Select time
          </legend>
          <p className="mt-1 text-xs text-muted-foreground">
            1-hour slots · ₹299 before 5 PM · ₹499 from 5 PM
          </p>
          {availableCount === 0 ? (
            <div className="mt-4 rounded-lg border border-border bg-black/40 p-6 text-center">
              <p className="display text-2xl">No slots left today.</p>
              <p className="mt-2 text-sm text-muted-foreground">Try another date.</p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {allHours().map((h) => {
                const disabled = taken.includes(h) || isPastSlot(selectedDate, h);
                const active = hour === h;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={disabled}
                    onClick={() => setHour(h)}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-3 text-left text-sm font-bold transition-all ${
                      disabled
                        ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground line-through"
                        : active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-black/40 hover:border-primary/60 hover:text-primary"
                    }`}
                  >
                    <span className="block">{hourLabel(h)}</span>
                    <span className="mt-0.5 block text-[0.65rem] font-semibold uppercase tracking-widest opacity-75">
                      {disabled ? "Taken" : `₹${priceForHour(h)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {errors.hour && <p className="mt-2 text-xs font-bold text-destructive">{errors.hour}</p>}
        </fieldset>

        {/* Step 3 — players */}
        <fieldset className="mt-8">
          <legend className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.2em]">
            <Users size={16} className="text-primary" /> Player count
          </legend>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              aria-label="Remove player"
              onClick={() => setPlayers((p) => Math.max(1, p - 1))}
              className="grid h-12 w-12 place-items-center rounded-full border border-border transition-colors hover:border-primary hover:text-primary"
            >
              <Minus size={18} />
            </button>
            <span className="display w-16 text-center text-4xl text-primary">{players}</span>
            <button
              type="button"
              aria-label="Add player"
              onClick={() => setPlayers((p) => Math.min(MAX_PLAYERS, p + 1))}
              className="grid h-12 w-12 place-items-center rounded-full border border-border transition-colors hover:border-primary hover:text-primary"
            >
              <Plus size={18} />
            </button>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Max {MAX_PLAYERS} players
            </span>
          </div>
        </fieldset>

        {/* Step 4 — details */}
        <fieldset className="mt-8">
          <legend className="text-sm font-extrabold uppercase tracking-[0.2em]">Booking details</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Name
              <input
                className="field mt-2 text-sm font-medium normal-case tracking-normal text-foreground"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                autoComplete="name"
              />
              {errors.name && <span className="mt-1 block text-destructive">{errors.name}</span>}
            </label>
            <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Phone
              <input
                className="field mt-2 text-sm font-medium normal-case tracking-normal text-foreground"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="10-digit number"
                inputMode="tel"
                autoComplete="tel"
              />
              {errors.phone && <span className="mt-1 block text-destructive">{errors.phone}</span>}
            </label>
            <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Email
              <input
                className="field mt-2 text-sm font-medium normal-case tracking-normal text-foreground"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@email.com"
                inputMode="email"
                autoComplete="email"
              />
              {errors.email && <span className="mt-1 block text-destructive">{errors.email}</span>}
            </label>
          </div>
        </fieldset>

        {/* Summary */}
        <div className="mt-8 rounded-xl border border-primary/40 bg-black/50 p-5">
          <p className="display text-lg">
            Gully United <span className="text-primary">XLV</span>
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">Date</dt>
              <dd className="mt-1 text-sm font-extrabold">{prettyDate(selectedDate)}</dd>
            </div>
            <div>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">Time</dt>
              <dd className="mt-1 text-sm font-extrabold">{hour === null ? "—" : slotLabel(hour)}</dd>
            </div>
            <div>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">Players</dt>
              <dd className="mt-1 text-sm font-extrabold">{players}</dd>
            </div>
            <div>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">Price</dt>
              <dd className="display mt-1 text-2xl text-primary">{price === null ? "—" : `₹${price}`}</dd>
            </div>
          </dl>
        </div>

        {errors.form && (
          <p className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
            {errors.form}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={confirm} disabled={submitting} className="btn-neon arrow-slide">
            {submitting ? "Confirming…" : "Confirm Booking"} <span className="arrow">→</span>
          </button>
          <button type="button" onClick={() => setPayOpen(true)} className="btn-ghost">
            <ShieldCheck size={16} /> Proceed to Payment
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Prototype mode — bookings are stored on this device until the live booking system is connected.
        </p>
      </div>

      {payOpen && <PaymentModal onClose={() => setPayOpen(false)} amount={price} />}
    </div>
  );
}

function PaymentModal({ onClose, amount }: { onClose: () => void; amount: number | null }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Payment"
      className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="panel w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl">Secure payment</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-primary">
            <X size={20} />
          </button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Secure payment powered by Razorpay. Online payment is not switched on yet — confirm your slot now and
          pay at the venue.
        </p>
        {amount !== null && (
          <p className="display mt-6 text-4xl text-primary">₹{amount}</p>
        )}
        <button type="button" onClick={onClose} className="btn-neon mt-6 w-full justify-center">
          Got it
        </button>
      </div>
    </div>
  );
}

function Confirmation({ booking, onReset }: { booking: Booking; onReset: () => void }) {
  const waText = encodeURIComponent(
    `Hi Gully United XLV, I have booked slot ${booking.ref} on ${prettyDate(booking.dateKey)} at ${slotLabel(
      booking.hour,
    )} for ${booking.players} players.`,
  );
  return (
    <div className="panel relative overflow-hidden p-6 text-center sm:p-10">
      <img
        src={pattern.url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={720}
        height={1280}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.08]"
      />
      <div className="relative">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check size={30} />
        </span>
        <h2 className="mt-6 text-[clamp(2rem,6vw,3.6rem)]">Booking Confirmed</h2>
        <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.4em] text-primary">{booking.ref}</p>

        <dl className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["Date", prettyDate(booking.dateKey)],
            ["Time", slotLabel(booking.hour)],
            ["Players", `${booking.players}`],
            ["Amount", `₹${booking.amount}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-sm font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-sm text-muted-foreground">
          {VENUE.name} · {VENUE.address}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={calendarLink(booking)} target="_blank" rel="noopener noreferrer" className="btn-neon">
            Add to Calendar
          </a>
          <a
            href={`${WHATSAPP_URL.split("?")[0]}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            WhatsApp Booking
          </a>
          <Link to="/" className="btn-ghost" onClick={onReset}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
