import { createFileRoute } from "@tanstack/react-router";
import { Facilities, FinalCTA, WhyGully } from "@/components/sections";

export const Route = createFileRoute("/facilities")({
  head: () => ({
    meta: [
      { title: "Facilities | Gully United XLV Turf Kota" },
      {
        name: "description",
        content:
          "Parking, washrooms, changing rooms, drinking water, seating and match kit — everything included at Gully United XLV turf in Kota.",
      },
      { property: "og:title", content: "Facilities | Gully United XLV Turf Kota" },
      {
        property: "og:description",
        content: "Changing rooms, parking, seating, water, bat, ball and stumps at the Kota turf.",
      },
    ],
  }),
  component: FacilitiesPage,
});

function FacilitiesPage() {
  return (
    <div className="pt-24">
      <Facilities />
      <WhyGully />
      <FinalCTA />
    </div>
  );
}
