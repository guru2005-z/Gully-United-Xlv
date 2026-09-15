import Link from "next/link";
import { Hero } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import {
  AboutVenueStory,
  ContactBlock,
  Facilities,
  FinalCTA,
  Gallery,
  Pricing,
  Testimonials,
  TurfExperience,
} from "@/components/sections";

export default function HomePage() {
  return (
    <main className="bg-[#050505] text-white">
      <Hero />

      {/* Quick Booking CTA Bar */}
      <section className="border-y border-white/10 bg-[#080808] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 lg:px-8 lg:flex-row lg:items-center">
          <Reveal>
            <h2 className="text-2xl sm:text-4xl font-black uppercase text-white font-display">
              BOOK YOUR <span className="text-[#ccff00]">TURF SLOT</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-400 font-medium">
              1-hour slots · Up to 7 days in advance · Max 16 players per turf.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <Link href="/book" className="btn-neon text-xs sm:text-sm">
              CHECK AVAILABILITY →
            </Link>
          </Reveal>
        </div>
      </section>

      <TurfExperience />
      <AboutVenueStory />
      <Facilities />
      <Pricing />
      <Gallery />
      <Testimonials />
      <ContactBlock />
      <FinalCTA />
    </main>
  );
}
