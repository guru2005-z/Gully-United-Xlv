import type { Metadata } from "next";
import { ContactBlock, FinalCTA } from "@/components/sections";

export const metadata: Metadata = {
  title: "Contact & Location | Gully United XLV, Kota",
  description:
    "Gully United XLV, SC Boys Residential School Road, Kota. Call 9390817811 or message on WhatsApp. Open daily 6 AM to 11 PM.",
};

export default function ContactPage() {
  return (
    <div className="pt-24">
      <ContactBlock />
      <FinalCTA />
    </div>
  );
}
