import { createFileRoute, Link } from "@tanstack/react-router";
import { Hero } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import {
  ContactBlock,
  Facilities,
  FinalCTA,
  Gallery,
  HowItWorks,
  PlayAfterDark,
  Pricing,
  TurfExperience,
  WhyGully,
} from "@/components/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gully United XLV | Premium Cricket Turf in Kota" },
      {
        name: "description",
        content:
          "Book Gully United XLV, a premium 100 × 50 ft artificial cricket turf in Kota with 14 floodlights, changing rooms, parking and 1-hour booking slots.",
      },
      { property: "og:title", content: "Gully United XLV | Premium Cricket Turf in Kota" },
      {
        property: "og:description",
        content: "Turf booking in Kota — ₹299/hour day, ₹499/hour night. Open 6 AM – 11 PM.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <Hero />

      <section className="border-y border-border bg-card py-14">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:items-center">
          <Reveal>
            <h2 className="text-[clamp(2rem,6vw,3.5rem)]">
              Book your <span className="text-primary">game</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              1-hour slots · up to 7 days ahead · max 16 players.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <Link to="/book" className="btn-neon arrow-slide">
              Check Availability <span className="arrow">→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      <TurfExperience />
      <WhyGully />
      <Facilities />
      <Pricing />
      <PlayAfterDark />
      <Gallery />
      <HowItWorks />
      <ContactBlock />
      <FinalCTA />
    </>
  );
}
