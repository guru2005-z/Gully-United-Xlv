import { Link } from "@tanstack/react-router";
import {
  Armchair,
  Baseline,
  Car,
  CircleDot,
  Clock4,
  Droplets,
  Lightbulb,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  ShowerHead,
  Shirt,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import pattern from "@/assets/pattern.asset.json";
import { Reveal, Counter, useInView } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { TurfScene } from "./TurfScene";
import { MAPS_URL, VENUE, WHATSAPP_URL } from "@/lib/booking";

const SHELL = "mx-auto max-w-[1400px] px-4 sm:px-6";

export function PatternBand({ opacity = 0.07 }: { opacity?: number }) {
  return (
    <img
      src={pattern.url}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={720}
      height={1280}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ opacity }}
    />
  );
}

/* ---------------- 3D turf experience ---------------- */

export function TurfExperience() {
  const stats = [
    { v: "100 × 50 FT", k: "Pitch size" },
    { v: "Artificial Astro Turf", k: "Surface" },
    { v: "14 Floodlights", k: "Lighting" },
    { v: "Max 16 Players", k: "Capacity" },
  ];
  return (
    <section className="relative overflow-hidden py-24" aria-labelledby="turf-3d">
      <div className={SHELL}>
        <SectionHeading
          eyebrow="The Experience"
          title={
            <span id="turf-3d">
              Step into
              <br />
              the <span className="text-primary">Gully</span>
            </span>
          }
          subtitle="A 100 × 50 ft floodlit astro turf built for fast, full-contact street cricket — move your cursor to look around."
        />
        <Reveal className="mt-10">
          <div className="panel overflow-hidden">
            <TurfScene compact />
          </div>
        </Reveal>
        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal as="li" key={s.k} delay={i * 80}>
              <div className="tilt-card h-full rounded-xl border border-border bg-card p-5">
                <p className="display text-xl text-primary sm:text-2xl">{s.v}</p>
                <p className="mt-2 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">{s.k}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Not just a turf ---------------- */

const FEATURES = [
  { n: "01", t: "100 × 50 FT Turf", Icon: Ruler },
  { n: "02", t: "Astro Artificial Turf", Icon: Baseline },
  { n: "03", t: "14 Floodlights", Icon: Lightbulb },
  { n: "04", t: "Max 16 Players", Icon: Users },
  { n: "05", t: "Open 6 AM – 11 PM", Icon: Clock4 },
  { n: "06", t: "1-Hour Slots", Icon: Zap },
];

export function WhyGully() {
  return (
    <section className="relative overflow-hidden border-y border-border py-24" aria-labelledby="why">
      <div className={SHELL}>
        <SectionHeading
          eyebrow="Why Gully United"
          title={<span id="why">Not just a turf.</span>}
          subtitle="A complete sports & entertainment experience."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal as="li" key={f.n} delay={i * 70}>
              <div className="tilt-card group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-7">
                <span className="display absolute right-5 top-4 text-5xl text-foreground/5">{f.n}</span>
                <f.Icon size={30} className="text-primary" strokeWidth={1.4} />
                <h3 className="mt-8 text-2xl">{f.t}</h3>
                <span className="mt-5 block h-px w-full bg-border">
                  <span className="block h-full w-0 bg-primary transition-all duration-500 group-hover:w-full" />
                </span>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Facilities ---------------- */

const FACILITIES = [
  { t: "Parking", Icon: Car },
  { t: "Washroom", Icon: ShowerHead },
  { t: "Changing Rooms", Icon: Shirt },
  { t: "Drinking Water", Icon: Droplets },
  { t: "Seating Area", Icon: Armchair },
  { t: "Ball", Icon: CircleDot },
  { t: "Bat", Icon: Baseline },
  { t: "Stumps", Icon: Zap },
];

export function Facilities() {
  return (
    <section className="relative overflow-hidden py-24" aria-labelledby="facilities">
      <PatternBand opacity={0.05} />
      <div className={`${SHELL} relative`}>
        <SectionHeading eyebrow="Facilities" title={<span id="facilities">Everything you need.</span>} />
        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {FACILITIES.map((f, i) => (
            <Reveal as="li" key={f.t} delay={i * 55}>
              <div className="tilt-card flex h-full flex-col items-start gap-6 rounded-2xl border border-border bg-black/70 p-6">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-primary/40 text-primary">
                  <f.Icon size={22} strokeWidth={1.4} />
                </span>
                <h3 className="text-xl">{f.t}</h3>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */

export function Pricing({ compact = false }: { compact?: boolean }) {
  const cards = [
    { title: "Day Session", window: "6:00 AM – 5:00 PM", price: 299, featured: false },
    { title: "Night Session", window: "5:00 PM – 11:00 PM", price: 499, featured: true },
  ];
  return (
    <section className="relative overflow-hidden border-y border-border py-24" aria-labelledby="pricing">
      <div className={SHELL}>
        <SectionHeading
          eyebrow="Pricing"
          title={<span id="pricing">Play more. Pay less.</span>}
          subtitle={compact ? undefined : "Flat hourly pricing. No memberships, no hidden charges."}
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 110}>
              <div
                className={`tilt-card relative h-full overflow-hidden rounded-3xl border p-8 sm:p-10 ${
                  c.featured ? "border-primary/60 bg-card" : "border-border bg-card"
                }`}
              >
                {c.featured && <PatternBand opacity={0.08} />}
                <div className="relative">
                  <h3 className="text-3xl sm:text-4xl">{c.title}</h3>
                  <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.3em] text-muted-foreground">
                    {c.window}
                  </p>
                  <p className="display mt-8 text-[clamp(3.5rem,12vw,6rem)] leading-none text-primary neon-glow">
                    ₹<Counter to={c.price} />
                  </p>
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.35em] text-muted-foreground">
                    Per hour
                  </p>
                  <Link to="/book" className="btn-neon arrow-slide mt-8">
                    Book {c.title} <span className="arrow">→</span>
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {["1 Hour Slots", "Max 16 Players", "Book up to 7 days in advance"].map((t, i) => (
            <Reveal as="li" key={t} delay={i * 70}>
              <div className="rounded-xl border border-border bg-black/50 px-5 py-4 text-center text-xs font-extrabold uppercase tracking-[0.2em] text-foreground/80">
                {t}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Play after dark ---------------- */

export function PlayAfterDark() {
  return (
    <section className="relative overflow-hidden py-28" aria-labelledby="dark">
      <div className="absolute inset-x-0 top-0 flex justify-around">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="h-[420px] w-[120px] animate-pulse-glow opacity-[0.13]"
            style={{
              background: "linear-gradient(to bottom, var(--primary), transparent 75%)",
              clipPath: "polygon(44% 0, 56% 0, 100% 100%, 0 100%)",
              animationDelay: `${i * 400}ms`,
            }}
          />
        ))}
      </div>
      <div className={`${SHELL} relative text-center`}>
        <Reveal>
          <h2 id="dark" className="text-[clamp(3.5rem,17vw,13rem)] leading-[0.78]">
            Play
            <br />
            After
            <br />
            <span className="text-primary neon-glow">Dark.</span>
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="mx-auto mt-8 max-w-md text-sm font-extrabold uppercase leading-relaxed tracking-[0.25em] text-muted-foreground">
            14 Floodlights.
            <br />
            One Turf.
            <br />
            Endless Games.
          </p>
        </Reveal>
        <Reveal delay={220}>
          <Link to="/book" className="btn-neon arrow-slide mt-10">
            Book a Night Session <span className="arrow">→</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Gallery ---------------- */

const GALLERY_TILES = [
  { label: "The Turf", span: "sm:col-span-2 sm:row-span-2" },
  { label: "Floodlights", span: "" },
  { label: "Night Game", span: "" },
  { label: "Seating Area", span: "" },
  { label: "Changing Rooms", span: "" },
  { label: "Match Day", span: "sm:col-span-2" },
];

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => ((i ?? 0) + 1) % GALLERY_TILES.length);
      if (e.key === "ArrowLeft") setOpen((i) => ((i ?? 0) - 1 + GALLERY_TILES.length) % GALLERY_TILES.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section className="relative overflow-hidden border-y border-border py-24" aria-labelledby="gallery">
      <div className={SHELL}>
        <SectionHeading
          eyebrow="Gallery"
          title={<span id="gallery">See the Gully.</span>}
          subtitle="Venue photos are being added. Share your turf pictures and they'll appear here."
        />
        <div className="mt-12 grid auto-rows-[150px] grid-cols-2 gap-4 sm:auto-rows-[190px] sm:grid-cols-4">
          {GALLERY_TILES.map((t, i) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setOpen(i)}
              className={`tilt-card group relative overflow-hidden rounded-2xl border border-border bg-black ${t.span}`}
              aria-label={`${t.label} — photo coming soon`}
            >
              <PatternBand opacity={0.14} />
              <span className="absolute inset-0 grid place-items-center">
                <span className="display text-lg text-foreground/70 transition-colors group-hover:text-primary sm:text-2xl">
                  {t.label}
                </span>
              </span>
              <span className="absolute bottom-3 left-3 text-[0.55rem] uppercase tracking-[0.25em] text-muted-foreground">
                Photo coming soon
              </span>
            </button>
          ))}
        </div>
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={GALLERY_TILES[open]?.label ?? "Gallery photo"}
          className="fixed inset-0 z-[90] grid place-items-center bg-black/90 p-6"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close viewer"
            className="absolute right-5 top-5 text-foreground hover:text-primary"
          >
            <X size={26} />
          </button>
          <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-primary/50 bg-black">
            <PatternBand opacity={0.16} />
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="display text-4xl">{GALLERY_TILES[open]?.label ?? "Gallery photo"}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Photo coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- How booking works ---------------- */

const STEPS = [
  { n: "01", t: "Choose Date" },
  { n: "02", t: "Select Slot" },
  { n: "03", t: "Enter Details" },
  { n: "04", t: "Confirm & Play" },
];

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <section className="relative py-24" aria-labelledby="how">
      <div className={SHELL}>
        <SectionHeading eyebrow="How it works" title={<span id="how">Book in 4 moves.</span>} />
        <div ref={ref} className="relative mt-14">
          <span className="absolute left-0 top-8 hidden h-px w-full bg-border lg:block">
            <span
              className="block h-full bg-primary transition-[width] duration-[1400ms] ease-out"
              style={{ width: inView ? "100%" : "0%" }}
            />
          </span>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 160}>
                <div className="relative">
                  <span className="grid h-16 w-16 place-items-center rounded-full border border-primary bg-background text-primary">
                    <span className="display text-2xl">{s.n}</span>
                  </span>
                  <h3 className="mt-6 text-2xl">{s.t}</h3>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Contact ---------------- */

export function ContactBlock() {
  return (
    <section className="relative overflow-hidden border-t border-border py-24" aria-labelledby="contact">
      <div className={SHELL}>
        <SectionHeading eyebrow="Location" title={<span id="contact">Find your Gully.</span>} />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="panel h-full p-8">
              <h3 className="text-3xl">
                Gully United <span className="text-primary">XLV</span>
              </h3>
              <address className="mt-6 space-y-4 text-sm not-italic text-muted-foreground">
                <p className="flex items-start gap-3 text-foreground">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                  {VENUE.address}
                </p>
                <p className="flex items-center gap-3">
                  <Phone size={18} className="shrink-0 text-primary" />
                  <a href={`tel:${VENUE.phone}`} className="hover:text-primary">
                    {VENUE.phone}
                  </a>
                </p>
                <p className="flex items-center gap-3">
                  <MessageCircle size={18} className="shrink-0 text-primary" />
                  <a href={`mailto:${VENUE.email}`} className="break-all hover:text-primary">
                    {VENUE.email}
                  </a>
                </p>
                <p className="flex items-center gap-3">
                  <Clock4 size={18} className="shrink-0 text-primary" />
                  Monday – Sunday · {VENUE.hours}
                </p>
              </address>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={`tel:${VENUE.phone}`} className="btn-neon arrow-slide">
                  Call Now <span className="arrow">→</span>
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost arrow-slide">
                  WhatsApp <span className="arrow">→</span>
                </a>
                <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost arrow-slide">
                  Get Directions <span className="arrow">→</span>
                </a>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="tilt-card relative flex h-full min-h-[320px] items-end overflow-hidden rounded-2xl border border-border bg-black p-8"
            >
              <PatternBand opacity={0.1} />
              <span className="relative">
                <span className="display block text-3xl">SC Boys Residential School Road</span>
                <span className="mt-2 block text-xs uppercase tracking-[0.3em] text-primary">
                  Kota · Open in Maps →
                </span>
              </span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-28">
      <div
        className="pointer-events-none absolute right-[8%] top-[18%] h-24 w-24 animate-floaty rounded-full ring-1 ring-primary/50"
        style={{
          background: "radial-gradient(circle at 32% 30%, oklch(0.35 0 0), oklch(0.1 0 0))",
          boxShadow: "0 0 60px -10px color-mix(in oklab, var(--primary) 70%, transparent)",
        }}
        aria-hidden="true"
      />
      <div className={`${SHELL} relative`}>
        <Reveal>
          <h2 className="text-[clamp(3.5rem,16vw,12rem)] leading-[0.8] text-primary neon-glow">
            Ready
            <br />
            to Play?
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-6 text-lg text-muted-foreground">Your next game starts here.</p>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/book" className="btn-neon arrow-slide">
              Book Your Slot <span className="arrow">→</span>
            </Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost arrow-slide">
              WhatsApp Us <span className="arrow">→</span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Sticky mobile CTA ---------------- */

export function MobileBookBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur-xl sm:hidden">
      <div className="flex gap-2">
        <Link to="/book" className="btn-neon flex-1 justify-center text-sm">
          Book Now
        </Link>
        <a
          href={`tel:${VENUE.phone}`}
          aria-label="Call Gully United XLV"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border text-primary"
        >
          <Phone size={18} />
        </a>
      </div>
    </div>
  );
}
