import { createFileRoute } from "@tanstack/react-router";
import { ContactBlock, FinalCTA, PlayAfterDark, TurfExperience, WhyGully } from "@/components/sections";

export const Route = createFileRoute("/venue")({
  head: () => ({
    meta: [
      { title: "The Venue | Gully United XLV Cricket Turf, Kota" },
      {
        name: "description",
        content:
          "Inside Gully United XLV: a 100 × 50 ft artificial astro turf in Kota with 14 floodlights, seating, changing rooms and parking.",
      },
      { property: "og:title", content: "The Venue | Gully United XLV Cricket Turf, Kota" },
      {
        property: "og:description",
        content: "100 × 50 ft floodlit astro turf on SC Boys Residential School Road, Kota.",
      },
    ],
  }),
  component: VenuePage,
});

function VenuePage() {
  return (
    <div className="pt-24">
      <TurfExperience />
      <WhyGully />
      <PlayAfterDark />
      <ContactBlock />
      <FinalCTA />
    </div>
  );
}
