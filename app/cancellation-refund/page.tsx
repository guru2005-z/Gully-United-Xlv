import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description: "Cancellation, slot reschedule, and refund rules for Gully United XLV turf in Kota.",
};

export default function CancellationRefundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold uppercase tracking-tight text-foreground sm:text-5xl">
        Cancellation & Refund Policy
      </h1>
      <p className="mt-2 text-sm uppercase tracking-[0.2em] text-primary">
        Last updated: September 14, 2026
      </p>

      <div className="mt-8 space-y-6 text-base text-muted-foreground leading-relaxed">
        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">
            1. Cancellation Window
          </h2>
          <p>
            Bookings cancelled at least 4 hours prior to the scheduled slot time are eligible for a
            100% refund or slot credit. Cancellations made within 4 hours of match start are
            non-refundable.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">2. Processing Time</h2>
          <p>
            Approved refunds are initiated immediately and credited back to the original source
            payment method (UPI, Debit/Credit card, Netbanking) via Razorpay within 5–7 business
            days.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">
            3. Weather & Facility Disruptions
          </h2>
          <p>
            If a match is cancelled by Gully United XLV due to severe weather, power outage, or
            emergency maintenance, players will receive a full 100% refund or an instant slot
            reschedule coupon.
          </p>
        </section>
      </div>
    </div>
  );
}
