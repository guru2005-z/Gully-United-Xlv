import { createFileRoute, Link } from "@tanstack/react-router";
import { Ban, ChevronLeft, ChevronRight, IndianRupee, Phone, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LogoMark } from "@/components/Logo";
import {
  allHours,
  bookableDays,
  dateKey,
  hourLabel,
  isPastSlot,
  loadBookings,
  prettyDate,
  removeBooking,
  slotLabel,
  takenHours,
  updateBooking,
  createBooking,
  priceForHour,
  type Booking,
} from "@/lib/booking";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Gully United XLV" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function useBookings() {
  const [list, setList] = useState<Booking[]>([]);
  useEffect(() => {
    const sync = () => setList(loadBookings());
    sync();
    window.addEventListener("guxlv:bookings", sync);
    return () => window.removeEventListener("guxlv:bookings", sync);
  }, []);
  return list;
}

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-primary/15 text-primary border-primary/40",
  PENDING: "bg-foreground/10 text-foreground border-border",
  CANCELLED: "bg-destructive/15 text-destructive border-destructive/40",
  BLOCKED: "bg-muted text-muted-foreground border-border",
};

function AdminPage() {
  const bookings = useBookings();
  const days = useMemo(() => bookableDays(), []);
  const [viewDate, setViewDate] = useState(() => dateKey(new Date()));
  const [detail, setDetail] = useState<Booking | null>(null);

  const todayKey = dateKey(new Date());
  const todays = bookings.filter((b) => b.dateKey === todayKey && b.status === "CONFIRMED");
  const revenue = todays.reduce((s, b) => s + b.amount, 0);
  const players = todays.reduce((s, b) => s + b.players, 0);
  const upcoming = bookings
    .filter((b) => b.dateKey >= todayKey && b.status === "CONFIRMED")
    .sort((a, b) => `${a.dateKey}${a.hour}`.localeCompare(`${b.dateKey}${b.hour}`));
  const hours = allHours();
  const viewTaken = takenHours(viewDate, bookings);
  const available = hours.filter((h) => !viewTaken.includes(h)).length;

  const stats = [
    { label: "Today's Bookings", value: todays.length, Icon: Users },
    { label: "Today's Revenue", value: `₹${revenue}`, Icon: IndianRupee },
    { label: "Upcoming Bookings", value: upcoming.length, Icon: ChevronRight },
    { label: "Total Players Today", value: players, Icon: Users },
  ];

  function blockSlot(h: number) {
    createBooking({
      name: "Venue Block",
      phone: "—",
      email: "—",
      players: 0,
      dateKey: viewDate,
      hour: h,
      amount: 0,
      status: "BLOCKED",
    }).catch(() => undefined);
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="h-8" />
            <span className="display truncate text-lg text-primary">Admin</span>
          </div>
          <Link to="/" className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">
            ← Back to site
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-6">
        <h1 className="text-[clamp(2.2rem,7vw,4.5rem)]">Control Room</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Prototype dashboard — data lives in this browser until the live system is connected.
        </p>

        {/* Stats */}
        <dl className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="tilt-card rounded-2xl border border-border bg-card p-5">
              <dt className="text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
                {s.label}
              </dt>
              <dd className="display mt-3 text-4xl text-primary">{s.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Bookings table */}
          <section aria-labelledby="bookings-table" className="panel overflow-hidden p-0">
            <h2 id="bookings-table" className="border-b border-border px-6 py-5 text-xl">
              Bookings
            </h2>
            {bookings.filter((b) => b.status !== "BLOCKED").length === 0 ? (
              <p className="px-6 py-10 text-sm text-muted-foreground">
                No bookings yet. New bookings made on the site will appear here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">
                      <th className="px-6 py-3">Booking ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Players</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...bookings]
                      .filter((b) => b.status !== "BLOCKED")
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map((b) => (
                        <tr key={b.id} className="border-b border-border/60 transition-colors hover:bg-card">
                          <td className="px-6 py-4 font-mono text-xs text-primary">{b.ref}</td>
                          <td className="px-4 py-4 font-bold">{b.name}</td>
                          <td className="px-4 py-4">{prettyDate(b.dateKey)}</td>
                          <td className="px-4 py-4">{hourLabel(b.hour)}</td>
                          <td className="px-4 py-4">{b.players}</td>
                          <td className="px-4 py-4 font-extrabold">₹{b.amount}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-block rounded-full border px-3 py-1 text-[0.6rem] font-extrabold tracking-[0.18em] ${STATUS_STYLE[b.status]}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setDetail(b)}
                                className="rounded-full border border-border px-3 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.15em] hover:border-primary hover:text-primary"
                              >
                                View
                              </button>
                              {b.status !== "CANCELLED" && (
                                <button
                                  type="button"
                                  onClick={() => updateBooking(b.id, { status: "CANCELLED" })}
                                  className="rounded-full border border-destructive/50 px-3 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.15em] text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Slot calendar */}
          <section aria-labelledby="slot-calendar" className="panel p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 id="slot-calendar" className="text-xl">
                Slots
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous day"
                  onClick={() => {
                    const i = days.findIndex((d) => dateKey(d) === viewDate);
                    { const d = days[i - 1]; if (d) setViewDate(dateKey(d)); }
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-primary hover:text-primary"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-[110px] text-center text-xs font-extrabold uppercase tracking-[0.15em]">
                  {prettyDate(viewDate)}
                </span>
                <button
                  type="button"
                  aria-label="Next day"
                  onClick={() => {
                    const i = days.findIndex((d) => dateKey(d) === viewDate);
                    { const d = days[i + 1]; if (d) setViewDate(dateKey(d)); }
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-primary hover:text-primary"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {available} available · {viewTaken.length} booked or blocked
            </p>
            <ul className="mt-5 space-y-2">
              {hours.map((h) => {
                const b = bookings.find(
                  (x) => x.dateKey === viewDate && x.hour === h && x.status !== "CANCELLED",
                );
                const past = isPastSlot(viewDate, h);
                return (
                  <li
                    key={h}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${
                      b ? "border-primary/50 bg-primary/10" : "border-border"
                    } ${past && !b ? "opacity-40" : ""}`}
                  >
                    <span className="font-bold">{slotLabel(h)}</span>
                    {b ? (
                      <span className={`rounded-full border px-2.5 py-0.5 text-[0.58rem] font-extrabold tracking-[0.15em] ${STATUS_STYLE[b.status]}`}>
                        {b.status === "BLOCKED" ? "Blocked" : b.ref}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={past}
                        onClick={() => blockSlot(h)}
                        className="inline-flex items-center gap-1 text-[0.6rem] font-extrabold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary disabled:cursor-not-allowed"
                      >
                        <Ban size={12} /> Block
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      {/* Customer detail modal */}
      {detail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Booking ${detail.ref}`}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setDetail(null)}
        >
          <div className="panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-mono text-xs text-primary">{detail.ref}</p>
            <h3 className="mt-2 text-2xl">{detail.name}</h3>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-bold">{detail.phone}</dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all font-bold">{detail.email}</dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Slot</dt>
                <dd className="font-bold">
                  {prettyDate(detail.dateKey)} · {slotLabel(detail.hour)}
                </dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Players</dt>
                <dd className="font-bold">{detail.players}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="display text-xl text-primary">₹{detail.amount}</dd>
              </div>
            </dl>
            <div className="mt-6 flex gap-2">
              {detail.phone !== "—" && (
                <a href={`tel:${detail.phone}`} className="btn-neon flex-1 justify-center text-xs">
                  <Phone size={14} /> Call
                </a>
              )}
              <button type="button" onClick={() => setDetail(null)} className="btn-ghost flex-1 justify-center text-xs">
                Close
              </button>
              {detail.status === "BLOCKED" && (
                <button
                  type="button"
                  onClick={() => {
                    removeBooking(detail.id);
                    setDetail(null);
                  }}
                  className="btn-ghost flex-1 justify-center text-xs"
                >
                  Unblock
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
