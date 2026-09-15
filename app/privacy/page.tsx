import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Gully United XLV turf booking service in Kota, Rajasthan.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold uppercase tracking-tight text-foreground sm:text-5xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm uppercase tracking-[0.2em] text-primary">
        Last updated: September 14, 2026
      </p>

      <div className="mt-8 space-y-6 text-base text-muted-foreground leading-relaxed">
        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">
            1. Information We Collect
          </h2>
          <p>
            When you create an account or book a slot at Gully United XLV, we collect personal
            information such as your name, phone number, and email address to process your
            reservations and send slot confirmations.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">2. Payment Security</h2>
          <p>
            All payment transactions are handled securely through Razorpay PCI-DSS compliant
            infrastructure. Gully United XLV does not store or process your credit card numbers,
            debit card numbers, UPI PINs, or bank account credentials on our servers.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">
            3. Use of Information
          </h2>
          <p>
            Your information is strictly used for managing turf bookings, sending instant SMS/Email
            notifications, managing account security, and offering support for refunds or slot
            changes. We never sell or lease your personal data to third parties.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold uppercase text-foreground mb-3">
            4. Data Protection & Contact
          </h2>
          <p>
            For any privacy inquiries, data removal requests, or account questions, please contact
            our support team at support@gullyunitedxlv.com or visit our venue in Kota.
          </p>
        </section>
      </div>
    </div>
  );
}
