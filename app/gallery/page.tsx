import type { Metadata } from "next";
import { FinalCTA, Gallery } from "@/components/sections";

export const metadata: Metadata = {
  title: "Gallery | Gully United XLV Cricket Turf Kota",
  description:
    "Photos from Gully United XLV, the floodlit artificial cricket turf on SC Boys Residential School Road, Kota.",
};

export default function GalleryPage() {
  return (
    <div className="pt-24">
      <Gallery />
      <FinalCTA />
    </div>
  );
}
