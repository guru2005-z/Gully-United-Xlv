import { createFileRoute } from "@tanstack/react-router";
import { ContactBlock, FinalCTA } from "@/components/sections";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Location | Gully United XLV, Kota" },
      {
        name: "description",
        content:
          "Gully United XLV, SC Boys Residential School Road, Kota. Call 9390817811 or message on WhatsApp. Open daily 6 AM – 11 PM.",
      },
      { property: "og:title", content: "Contact & Location | Gully United XLV, Kota" },
      { property: "og:description", content: "Call, WhatsApp or get directions to the Kota turf." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="pt-24">
      <ContactBlock />
      <FinalCTA />
    </div>
  );
}
