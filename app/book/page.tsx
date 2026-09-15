import type { Metadata } from "next";
import { BookingWidget } from "@/components/BookingWidget";
import { HowItWorks } from "@/components/sections";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Book a Turf Slot | Gully United XLV Kota",
  description:
    "Book a one-hour cricket turf slot at Gully United XLV, Kota. Day and night pricing, up to 16 players.",
};

export default function BookPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-32 sm:px-6">
      <SectionHeading
        eyebrow="Booking"
        title={
          <>
            Book your <span className="text-primary">game</span>
          </>
        }
        subtitle="Choose a date, lock a one-hour slot and confirm. INR 299/hour before 5 PM, INR 499/hour from 5 PM."
      />
      <div className="mt-10">
        <BookingWidget />
      </div>
      <HowItWorks />
    </div>
  );
}
