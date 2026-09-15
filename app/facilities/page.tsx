import type { Metadata } from "next";
import { Facilities, FinalCTA } from "@/components/sections";

export const metadata: Metadata = {
  title: "Facilities | Gully United XLV Turf Kota",
  description:
    "Parking, washrooms, changing rooms, drinking water, seating and match kit at Gully United XLV turf in Kota.",
};

export default function FacilitiesPage() {
  return (
    <div className="pt-24 bg-[#050505] text-white">
      <Facilities />
      <FinalCTA />
    </div>
  );
}
