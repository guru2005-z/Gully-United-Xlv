import type { Metadata } from "next";
import { AboutVenueStory, ContactBlock, FinalCTA, TurfExperience } from "@/components/sections";

export const metadata: Metadata = {
  title: "The Venue | Gully United XLV Cricket Turf, Kota",
  description:
    "Inside Gully United XLV: a 100 × 50 ft artificial astro turf in Kota with floodlights, seating, changing rooms and parking.",
};

export default function VenuePage() {
  return (
    <div className="pt-24 bg-[#050505] text-white">
      <TurfExperience />
      <AboutVenueStory />
      <ContactBlock />
      <FinalCTA />
    </div>
  );
}
