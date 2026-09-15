import type { Metadata } from "next";
import { FinalCTA, HowItWorks, Pricing } from "@/components/sections";

export const metadata: Metadata = {
  title: "Turf Pricing in Kota | Gully United XLV",
  description:
    "Gully United XLV turf pricing in Kota: INR 299 per hour from 6 AM to 5 PM and INR 499 per hour from 5 PM to 11 PM.",
};

export default function PricingPage() {
  return (
    <div className="pt-24">
      <Pricing />
      <HowItWorks />
      <FinalCTA />
    </div>
  );
}
