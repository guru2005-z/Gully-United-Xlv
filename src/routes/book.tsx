import { createFileRoute } from "@tanstack/react-router";
import { BookingWidget } from "@/components/BookingWidget";
import { HowItWorks } from "@/components/sections";
import { SectionHeading } from "@/components/SectionHeading";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a Turf Slot | Gully United XLV Kota" },
      {
        name: "description",
        content:
          "Book a 1-hour cricket turf slot at Gully United XLV, Kota. ₹299/hour before 5 PM, ₹499/hour after. Up to 16 players, 7 days in advance.",
      },
      { property: "og:title", content: "Book a Turf Slot | Gully United XLV Kota" },
      {
        property: "og:description",
        content: "Pick a date, choose your hour and confirm — turf booking in Kota made simple.",
      },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-32 sm:px-6">
      <SectionHeading
        eyebrow="Booking"
        title={
          <>
            Book your <span className="text-primary">game</span>
          </>
        }
        subtitle="Choose a date, lock a 1-hour slot and confirm. ₹299/hour before 5 PM, ₹499/hour from 5 PM."
      />
      <div className="mt-10">
        <BookingWidget />
      </div>
      <HowItWorks />
    </div>
  );
}
