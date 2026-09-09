import { createFileRoute } from "@tanstack/react-router";
import { FinalCTA, HowItWorks, Pricing } from "@/components/sections";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Turf Pricing in Kota | Gully United XLV" },
      {
        name: "description",
        content:
          "Gully United XLV turf pricing in Kota: ₹299 per hour from 6 AM to 5 PM and ₹499 per hour from 5 PM to 11 PM. 1-hour slots, max 16 players.",
      },
      { property: "og:title", content: "Turf Pricing in Kota | Gully United XLV" },
      { property: "og:description", content: "₹299/hour day sessions and ₹499/hour night sessions." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="pt-24">
      <Pricing />
      <HowItWorks />
      <FinalCTA />
    </div>
  );
}
