"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Clock,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
  ArrowRight,
  Mail,
  Phone,
  Tag,
  CheckCircle2,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth-client";
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
  loadBookings,
  prettyDate,
  priceForHour,
  slotLabel,
  takenHours,
  type Booking,
  bookingInputSchema,
} from "@/lib/booking";

const STEPS = ["Date", "Time", "Players", "Details"] as const;

export function BookingWidget() {
  const router = useRouter();
  const days = useMemo(() => bookableDays(), []);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [hour, setHour] = useState<number | null>(null);
  const [players, setPlayers] = useState(10);
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [booked, setBooked] = useState<Booking | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [existing, setExisting] = useState<Booking[]>([]);
  const idempotencyKey = useRef<string | null>(null);
  const [payingRazorpay, setPayingRazorpay] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPaise: number;
    discountAmountRupees: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setForm((prev) => ({
          name:
            prev.name ||
            data.user?.user_metadata?.["full_name"] ||
            data.user?.user_metadata?.["name"] ||
            "",
          phone: prev.phone || data.user?.user_metadata?.["phone"] || data.user?.phone || "",
          email: prev.email || data.user?.email || "",
        }));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setForm((prev) => ({
          name:
            prev.name ||
            session.user.user_metadata?.["full_name"] ||
            session.user.user_metadata?.["name"] ||
            "",
          phone: prev.phone || session.user.user_metadata?.["phone"] || session.user.phone || "",
          email: prev.email || session.user.email || "",
        }));
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);

    const basePricePaise = price ? price * 100 : 29900;
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput.trim(),
          amountPaise: basePricePaise,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.error?.message || "Invalid promo code.");
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: data.code,
          discountPaise: data.discountPaise,
          discountAmountRupees: data.discountAmountRupees,
        });
        setCouponSuccess(
          data.message || `Promo code ${data.code} applied! Saved ₹${data.discountAmountRupees}.`,
        );
        setCouponInput("");
      }
    } catch {
      setCouponError("Failed to validate coupon code.");
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponSuccess(null);
    setCouponError(null);
  }

  async function handleInitiateRazorpayPayment() {
    if (!user) {
      router.push("/auth?redirect=/book");
      return;
    }
    if (!validate() || hour === null) return;
    setPayingRazorpay(true);
    setPaymentNotice(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrors({ form: "Failed to load Razorpay payment SDK. Check network connection." });
        setPayingRazorpay(false);
        return;
      }

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          hour,
          players,
          customerName: form.name.trim(),
          customerPhone: form.phone.replace(/\D/g, ""),
          customerEmail: form.email.trim(),
          couponCode: appliedCoupon?.code,
          discountPaise: appliedCoupon?.discountPaise || 0,
          idempotencyKey: idempotencyKey.current || crypto.randomUUID(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to create payment order.");
      }

      const orderData = await res.json();
      const options = {
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || "INR",
        name: "Gully United XLV Turf",
        description: `Turf Booking (${orderData.bookingRef || prettyDate(selectedDate)})`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.customerPrefill?.name || form.name,
          email: orderData.customerPrefill?.email || form.email,
          contact: orderData.customerPrefill?.phone || form.phone,
        },
        theme: { color: "#CCFF00" },
        handler: async function (response: Record<string, unknown>) {
          setSubmitting(true);
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: orderData.bookingId,
                razorpay_order_id: response["razorpay_order_id"],
                razorpay_payment_id: response["razorpay_payment_id"],
                razorpay_signature: response["razorpay_signature"],
              }),
            });

            if (verifyRes.ok) {
              setBooked({
                id: orderData.bookingId || "paid-booking",
                ref: orderData.bookingRef || "GUX-ONLINE",
                name: form.name,
                phone: form.phone,
                email: form.email,
                dateKey: selectedDate,
                hour,
                players,
                amount: orderData.amountPaise / 100,
                status: "CONFIRMED",
                paymentStatus: "PAID",
                paymentMethod: "razorpay",
                notes: null,
                createdAt: new Date().toISOString(),
              });
              setPayOpen(false);
            } else {
              const errData = await verifyRes.json();
              setErrors({ form: errData.error?.message || "Payment verification failed." });
            }
          } catch {
            setErrors({ form: "Error verifying payment signature." });
          } finally {
            setSubmitting(false);
            setPayingRazorpay(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPayingRazorpay(false);
            setPaymentNotice("Slot held for 10 minutes. Complete payment to secure your booking!");
          },
        },
      };

      const razorpay = new (
        window as unknown as {
          Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
        }
      ).Razorpay(options);
      razorpay.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate online payment.";
      setErrors({ form: msg });
      setPayingRazorpay(false);
    }
  }

  useEffect(() => {
    let alive = true;
    const sync = async () => {
      setLoadingAvailability(true);
      try {
        const bookings = await loadBookings({
          from: days[0] ? dateKey(days[0]) : selectedDate,
          to: days.length > 0 ? dateKey(days[days.length - 1]!) : selectedDate,
        });
        if (!alive) return;
        setExisting(bookings);
        setErrors((current) => {
          const { availability: _availability, ...rest } = current;
          return rest;
        });
      } catch {
        if (!alive) return;
        setErrors((current) => ({
          ...current,
          availability:
            "Live availability is not ready yet. Please call the venue if this keeps happening.",
        }));
      } finally {
        if (alive) setLoadingAvailability(false);
      }
    };
    sync();
    window.addEventListener("guxlv:bookings", sync);
    return () => {
      alive = false;
      window.removeEventListener("guxlv:bookings", sync);
    };
  }, [days, selectedDate]);

  const taken = takenHours(selectedDate, existing);
  const price = hour === null ? null : priceForHour(hour);
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmountRupees : 0;
  const finalPrice = price !== null ? Math.max(0, price - discountAmount) : null;
  const availableCount = allHours().filter(
    (h) => !taken.includes(h) && !isPastSlot(selectedDate, h),
  ).length;

  function validate() {
    const result = bookingInputSchema.safeParse({
      name: form.name,
      phone: form.phone,
      email: form.email,
      players,
      dateKey: selectedDate,
      hour: hour ?? -1,
    });
    const e: Record<string, string> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        e[key === "dateKey" ? "date" : key] = issue.message;
      }
    }
    if (hour === null) e["hour"] = "Select a time slot.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function confirm() {
    if (!user) {
      router.push("/auth?redirect=/book");
      return;
    }
    if (!validate() || hour === null) return;
    setSubmitting(true);
    try {
      idempotencyKey.current ??= crypto.randomUUID();
      const b = await createBooking(
        {
          name: form.name.trim(),
          phone: form.phone.replace(/\D/g, ""),
          email: form.email.trim(),
          players,
          dateKey: selectedDate,
          hour,
        },
        idempotencyKey.current,
      );
      setBooked(b);
      idempotencyKey.current = null;
      window.scrollTo({ top: window.scrollY - 80, behavior: "smooth" });
    } catch (err) {
      setErrors({
        form:
          (err as Error).message === "SLOT_TAKEN"
            ? "This slot is taken. Try another time."
            : "Something went wrong. Please try again.",
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
            <li
              key={s}
              className={`rounded-lg px-2 py-1.5 text-center text-[0.62rem] font-extrabold uppercase tracking-[0.2em] transition-colors ${
                i === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </li>
          ))}
        </ol>

        {/* Step 1 — date */}
        <fieldset>
          <legend className="text-sm font-extrabold uppercase tracking-[0.2em]">Select date</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {days.map((d) => {
              const k = dateKey(d);
              const active = k === selectedDate;
              return (
                <button
                  type="button"
                  key={k}
                  onClick={() => {
                    setSelectedDate(k);
                    setHour(null);
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-black/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.2em]">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="display mt-0.5 block text-lg">{prettyDate(k)}</span>
                </button>
              );
            })}
          </div>
          {errors["date"] && <p className="mt-2 text-xs text-destructive">{errors["date"]}</p>}
        </fieldset>

        {/* Step 2 — time */}
        <fieldset className="mt-8">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-extrabold uppercase tracking-[0.2em]">
              Select hour
            </legend>
            <span className="text-xs font-bold text-muted-foreground">
              {availableCount} slots available
            </span>
          </div>
          {loadingAvailability && (
            <p className="mt-2 text-xs text-muted-foreground animate-pulse">
              Syncing live availability…
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
            {allHours().map((h) => {
              const isTaken = taken.includes(h);
              const isPast = isPastSlot(selectedDate, h);
              const disabled = isTaken || isPast;
              const active = hour === h;
              const p = priceForHour(h);
              return (
                <button
                  type="button"
                  key={h}
                  disabled={disabled}
                  onClick={() => setHour(h)}
                  className={`group relative rounded-xl p-3.5 text-left transition-all duration-200 ${
                    active ? "slot-selected" : disabled ? "slot-booked" : "slot-available"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold tracking-tight">{hourLabel(h)}</span>
                    {disabled ? (
                      <span className="text-[0.6rem] font-bold uppercase tracking-wider flex items-center gap-1 opacity-75">
                        <Lock size={10} /> {isPast ? "Past" : "Taken"}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`mt-2 text-xs font-black font-mono ${active ? "text-black" : "text-[#ccff00]"}`}
                  >
                    ₹{p}
                  </div>
                </button>
              );
            })}
          </div>
          {errors["hour"] && <p className="mt-2 text-xs text-destructive">{errors["hour"]}</p>}
        </fieldset>

        {/* Step 3 — players */}
        <fieldset className="mt-8">
          <legend className="text-sm font-extrabold uppercase tracking-[0.2em]">
            Number of players
          </legend>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPlayers(Math.max(2, players - 1))}
              className="btn-ghost !px-3 !py-2"
            >
              <Minus size={16} />
            </button>
            <span className="display text-3xl font-extrabold text-primary w-12 text-center">
              {players}
            </span>
            <button
              type="button"
              onClick={() => setPlayers(Math.min(MAX_PLAYERS, players + 1))}
              className="btn-ghost !px-3 !py-2"
            >
              <Plus size={16} />
            </button>
            <span className="text-xs text-muted-foreground">
              Max {MAX_PLAYERS} players per slot
            </span>
          </div>
        </fieldset>

        {/* Step 4 — Details & Coupon */}
        <fieldset className="mt-8">
          <legend className="text-sm font-extrabold uppercase tracking-[0.2em] text-white flex items-center gap-2">
            <UserIcon size={18} className="text-[#CCFF00]" /> Booking Details & Discounts
          </legend>

          <div className="mt-4 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-6 shadow-2xl backdrop-blur-xl">
            {/* Input Row: Name, Phone, Email */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Full Name Input */}
              <div className="space-y-1.5">
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                  Full Name <span className="text-[#CCFF00]">*</span>
                </label>
                <div className="relative flex items-center">
                  <UserIcon
                    className="absolute left-3.5 text-neutral-500 pointer-events-none"
                    size={16}
                  />
                  <input
                    type="text"
                    required
                    className="w-full bg-black border border-neutral-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] focus:outline-none transition-all font-medium"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                </div>
                {errors["name"] && (
                  <p className="text-[0.65rem] font-semibold text-red-400">{errors["name"]}</p>
                )}
              </div>

              {/* Mobile Phone Input */}
              <div className="space-y-1.5">
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                  Phone Number <span className="text-[#CCFF00]">*</span>
                </label>
                <div className="relative flex items-center">
                  <Phone
                    className="absolute left-3.5 text-neutral-500 pointer-events-none"
                    size={16}
                  />
                  <input
                    type="tel"
                    required
                    className="w-full bg-black border border-neutral-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] focus:outline-none transition-all font-medium"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
                {errors["phone"] && (
                  <p className="text-[0.65rem] font-semibold text-red-400">{errors["phone"]}</p>
                )}
              </div>

              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label className="block text-[0.65rem] font-black uppercase tracking-widest text-neutral-400">
                  Email Address <span className="text-[#CCFF00]">*</span>
                </label>
                <div className="relative flex items-center">
                  <Mail
                    className="absolute left-3.5 text-neutral-500 pointer-events-none"
                    size={16}
                  />
                  <input
                    type="email"
                    required
                    className="w-full bg-black border border-neutral-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] focus:outline-none transition-all font-medium"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@email.com"
                    inputMode="email"
                    autoComplete="email"
                  />
                </div>
                {errors["email"] && (
                  <p className="text-[0.65rem] font-semibold text-red-400">{errors["email"]}</p>
                )}
              </div>
            </div>

            {/* Promo / Coupon Code Card */}
            <div className="border-t border-neutral-800 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                  <Tag size={14} className="text-[#CCFF00]" /> Promo / Coupon Code
                </label>
                <span className="text-[0.6rem] text-neutral-500 font-bold uppercase tracking-wider">
                  Codes: GULLY10, GULLY20, WELCOME
                </span>
              </div>

              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-white uppercase placeholder-neutral-600 focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] focus:outline-none transition-all font-mono font-bold"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="ENTER COUPON CODE (e.g. GULLY10)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#CCFF00] text-black text-xs font-black uppercase tracking-wider hover:bg-[#b8e600] transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? "Validating..." : "Apply Coupon"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/40">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="text-[#CCFF00]" size={18} />
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-white">
                        Coupon Code <span className="text-[#CCFF00]">{appliedCoupon.code}</span>{" "}
                        Applied!
                      </div>
                      <div className="text-[0.65rem] text-[#CCFF00] font-bold">
                        Instant Savings of ₹{appliedCoupon.discountAmountRupees}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-neutral-400 hover:text-white underline uppercase tracking-wider"
                  >
                    Remove
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-xs font-semibold text-red-400 flex items-center gap-1">
                  ✕ {couponError}
                </p>
              )}
              {couponSuccess && !appliedCoupon && (
                <p className="text-xs font-semibold text-[#CCFF00] flex items-center gap-1">
                  ✓ {couponSuccess}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Summary */}
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <p className="display text-lg font-black text-white uppercase tracking-wide">
              Gully United <span className="text-[#CCFF00]">XLV</span> Summary
            </p>
            <span className="px-2.5 py-1 rounded-full bg-[#CCFF00]/10 text-[#CCFF00] text-[0.65rem] font-black uppercase border border-[#CCFF00]/30">
              Instant Slot Lock
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-neutral-400 font-bold">
                Date
              </dt>
              <dd className="mt-1 text-sm font-extrabold text-white">{prettyDate(selectedDate)}</dd>
            </div>
            <div>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-neutral-400 font-bold">
                Time
              </dt>
              <dd className="mt-1 text-sm font-extrabold text-white">
                {hour === null ? "—" : slotLabel(hour)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-neutral-400 font-bold">
                Players
              </dt>
              <dd className="mt-1 text-sm font-extrabold text-white">{players} Squad</dd>
            </div>
            <div>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-neutral-400 font-bold">
                Total Payable
              </dt>
              <dd className="display mt-1 text-2xl font-black text-[#CCFF00] flex items-baseline gap-2">
                {finalPrice === null ? "—" : `₹${finalPrice}`}
                {appliedCoupon && price !== null && (
                  <span className="text-xs text-neutral-500 line-through font-normal">
                    ₹{price}
                  </span>
                )}
              </dd>
            </div>
          </dl>

          {appliedCoupon && (
            <div className="flex items-center justify-between text-xs text-[#CCFF00] font-bold border-t border-neutral-800/80 pt-2.5">
              <span>Promo Discount ({appliedCoupon.code}):</span>
              <span>-₹{appliedCoupon.discountAmountRupees}</span>
            </div>
          )}
        </div>

        {paymentNotice && (
          <p className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-300">
            ⏳ {paymentNotice}
          </p>
        )}

        {errors["form"] && (
          <p className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
            {errors["form"]}
          </p>
        )}

        {!user ? (
          <div className="mt-6 rounded-2xl border border-primary/40 bg-black/80 p-6 text-center space-y-4 shadow-[0_0_30px_rgba(204,255,0,0.1)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock size={22} />
            </div>
            <div>
              <h4 className="text-base font-black uppercase tracking-wider text-white">
                Sign In or Register Required
              </h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                To reserve and lock your turf slot at Gully United XLV, please log in to your
                account or register in seconds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/auth?redirect=/book")}
              className="btn-neon inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-6 py-3"
            >
              <span>Sign In / Register to Book</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleInitiateRazorpayPayment}
                disabled={payingRazorpay || submitting}
                className="btn-neon arrow-slide w-full sm:w-auto justify-center"
              >
                {payingRazorpay ? "Opening Razorpay…" : "Pay Online Now (Razorpay)"}{" "}
                <span className="arrow">→</span>
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Online payments processed instantly via Razorpay UPI, Cards, NetBanking.
            </p>
          </>
        )}
      </div>

      {payOpen && (
        <PaymentModal
          onClose={() => setPayOpen(false)}
          amount={price}
          onPayOnline={handleInitiateRazorpayPayment}
        />
      )}
    </div>
  );
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PaymentModal({
  onClose,
  amount,
  onPayOnline,
}: {
  onClose: () => void;
  amount: number | null;
  onPayOnline?: () => void;
}) {
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
      <div className="panel w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-primary">
              Razorpay Secured Gateway
            </span>
            <h3 className="text-2xl font-black">Checkout Payment</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-primary"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Instant booking confirmation powered by Razorpay 256-bit SSL encrypted checkout.
        </p>

        {amount !== null && <p className="display text-4xl text-primary font-black">₹{amount}</p>}

        <div className="space-y-2 pt-2">
          {onPayOnline && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onPayOnline();
              }}
              className="btn-neon w-full justify-center text-sm"
            >
              Pay Online Now via Razorpay
            </button>
          )}
        </div>
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
        <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.4em] text-primary">
          {booking.ref}
        </p>

        <dl className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["Date", prettyDate(booking.dateKey)],
            ["Time", slotLabel(booking.hour)],
            ["Players", `${booking.players}`],
            ["Amount", `₹${booking.amount}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                {k}
              </dt>
              <dd className="mt-1 text-sm font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-sm text-muted-foreground">
          {VENUE.name} · {VENUE.address}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={calendarLink(booking)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-neon"
          >
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
          <Link href="/" className="btn-ghost" onClick={onReset}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
