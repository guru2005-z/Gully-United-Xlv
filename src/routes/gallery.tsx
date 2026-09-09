import { createFileRoute } from "@tanstack/react-router";
import { FinalCTA, Gallery } from "@/components/sections";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery | Gully United XLV Cricket Turf Kota" },
      {
        name: "description",
        content:
          "Photos from Gully United XLV — the floodlit artificial cricket turf on SC Boys Residential School Road, Kota.",
      },
      { property: "og:title", content: "Gallery | Gully United XLV Cricket Turf Kota" },
      { property: "og:description", content: "See the turf, the floodlights and match nights in Kota." },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  return (
    <div className="pt-24">
      <Gallery />
      <FinalCTA />
    </div>
  );
}
