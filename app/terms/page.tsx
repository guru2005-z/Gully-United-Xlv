import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for booking and using Gully United XLV turf in Kota.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold uppercase tracking-tight text-foreground sm:text-5xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm uppercase tracking-[0.2em] text-primary">
        Last updated: September 14, 2026
      </p>

      <div className="mt-8 space-y-6 text-base text-muted-foreground leading-relaxed">
        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">
            1. Slot Duration & Timings
          </h2>
          <p>
            Each booked slot is strictly valid for 60 minutes starting at the scheduled hour. Teams
            must enter and leave the turf promptly to ensure the next scheduled match starts without
            delay.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">
            2. Turf Rules & Equipment
          </h2>
          <p>
            Players must wear flat-soled sports shoes or non-marking turf shoes. Metal spikes,
            studs, smoking, chewing gum, alcohol, and hazardous objects are strictly prohibited on
            the turf surface.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">
            3. Liability & Safety
          </h2>
          <p>
            Players participate at their own risk. Gully United XLV management is not liable for
            personal injuries, physical loss, or damage to personal items brought onto the premises.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">4. Conduct</h2>
          <p>
            Management reserves the right to terminate any active session without refund if players
            engage in violent behavior, damage equipment, or violate facility decorum.
          </p>
        </section>
      </div>
    </div>
  );
}
