"use client";

import Link from "next/link";
import {
  Armchair,
  Baseline,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock4,
  Droplets,
  Film,
  Image as ImageIcon,
  Lightbulb,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Play,
  Ruler,
  Send,
  Shirt,
  ShowerHead,
  Sparkles,
  Users,
  X,
  Zap,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import pattern from "@/assets/pattern.asset.json";
import { Reveal, Counter, useInView } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { TurfScene } from "./TurfScene";
import { MAPS_URL, VENUE, WHATSAPP_URL } from "@/lib/booking";

const SHELL = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

export function PatternBand({ opacity = 0.05 }: { opacity?: number }) {
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

/* ---------------- VENUE BENTO SECTION ---------------- */

export function TurfExperience() {
  const bentoStats = [
    { num: "100 × 50", label: "FT DIMENSIONS", desc: "Spacious arena for fast 8v8 cricket" },
    { num: "ASTRO", label: "PRO TURF", desc: "All-weather high traction synthetic grass" },
    { num: "16", label: "MAX PLAYERS", desc: "Optimal capacity for high-energy matches" },
    { num: "14", label: "FLOODLIGHTS", desc: "Pro-grade shadowless LED illumination" },
  ];

  return (
    <section className="relative overflow-hidden py-24" aria-labelledby="venue-bento">
      <div className={SHELL}>
        <SectionHeading
          eyebrow="THE VENUE"
          title={
            <span id="venue-bento">
              BUILT FOR <span className="text-[#ccff00] neon-glow">PERFORMANCE</span>
            </span>
          }
          subtitle="Engineered with tournament-grade materials, pro lighting, and precision turf dimensions."
        />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {bentoStats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="bento-card p-8 h-full flex flex-col justify-between group">
                <div>
                  <p className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight group-hover:text-[#ccff00] transition-colors">
                    {s.num}
                  </p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-[#ccff00]">
                    {s.label}
                  </p>
                </div>
                <p className="mt-6 text-xs text-gray-400 font-medium leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8">
          <div className="bento-card overflow-hidden p-2">
            <TurfScene compact />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- ABOUT / VENUE STORY SPLIT ---------------- */

export function AboutVenueStory() {
  return (
    <section
      className="relative overflow-hidden py-24 border-t border-white/10"
      aria-labelledby="story"
    >
      <div className={SHELL}>
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Large Venue Image Container */}
          <Reveal className="lg:col-span-7">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 group min-h-[380px] sm:min-h-[480px]">
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10" />
              <TurfScene compact />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="px-3.5 py-1.5 rounded-full border border-[#ccff00]/40 bg-black/70 backdrop-blur-md text-[0.65rem] font-extrabold uppercase tracking-widest text-[#ccff00]">
                  KOTA, NELLORE (AP)
                </span>
                <p className="mt-3 text-2xl font-black uppercase text-white font-display">
                  GULLY UNITED XLV ARENA
                </p>
              </div>
            </div>
          </Reveal>

          {/* Overlapping Glass Text Panel */}
          <Reveal className="lg:col-span-5" delay={120}>
            <div className="bento-card p-8 sm:p-10 relative z-20 lg:-ml-12 border-l-2 border-l-[#ccff00]">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-[#ccff00]">
                VENUE STORY
              </span>
              <h2
                id="story"
                className="mt-3 text-3xl sm:text-4xl font-black uppercase text-white leading-tight"
              >
                Gully United XLV
              </h2>
              <p className="mt-4 text-sm text-gray-300 font-medium leading-relaxed">
                Created to elevate street cricket into an electric, professional sports-tech
                experience. Located in Kota, Nellore, our facility combines artificial astro turf,
                14 shadowless LED floodlights, and premium player amenities.
              </p>
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-6">
                <div>
                  <p className="text-2xl font-black text-[#ccff00] font-mono">100%</p>
                  <p className="text-[0.65rem] uppercase font-bold text-gray-400 tracking-wider">
                    Astro Turf
                  </p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-black text-[#ccff00] font-mono">6 AM - 11 PM</p>
                  <p className="text-[0.65rem] uppercase font-bold text-gray-400 tracking-wider">
                    Operating Hours
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FACILITIES BENTO GRID ---------------- */

const FACILITIES_LIST = [
  { t: "Parking", desc: "Dedicated spacious vehicle parking lot", Icon: Car },
  { t: "Washroom", desc: "Clean, hygienic rest facilities", Icon: ShowerHead },
  { t: "Changing Room", desc: "Private room for player wardrobe", Icon: Shirt },
  { t: "Drinking Water", desc: "Chilled purified mineral water station", Icon: Droplets },
  { t: "Seating Area", desc: "Comfortable spectator lounge benches", Icon: Armchair },
  { t: "Match Ball", desc: "Standard heavy tennis match balls", Icon: CircleDot },
  { t: "Cricket Bat", desc: "Tournament grade cricket bats provided", Icon: Baseline },
  { t: "Floodlights", desc: "14 Shadowless high-lumen LEDs", Icon: Lightbulb },
];

export function Facilities() {
  return (
    <section
      className="relative overflow-hidden py-24 border-t border-white/10"
      aria-labelledby="facilities"
    >
      <div className={SHELL}>
        <SectionHeading
          eyebrow="AMENITIES"
          title={<span id="facilities">EVERYTHING YOU NEED</span>}
          subtitle="All equipment, amenities, and player gear provided with every turf slot booking."
        />

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FACILITIES_LIST.map((f, i) => (
            <Reveal key={f.t} delay={i * 50}>
              <div className="bento-card p-6 h-full flex flex-col justify-between group">
                <div>
                  <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#ccff00] group-hover:border-[#ccff00]/40 group-hover:bg-[#ccff00]/10 transition-all">
                    <f.Icon size={22} strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-6 text-xl font-bold uppercase text-white">{f.t}</h3>
                  <p className="mt-2 text-xs text-gray-400 font-medium leading-relaxed">{f.desc}</p>
                </div>
                <div className="mt-6 h-[2px] w-full bg-white/5 group-hover:bg-[#ccff00] transition-colors" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- PRICING BENTO SECTION ---------------- */

export function Pricing({ compact = false }: { compact?: boolean }) {
  const pricingCards = [
    {
      title: "DAY SESSION",
      window: "6:00 AM – 5:00 PM",
      price: 299,
      tag: "STANDARD DAY RATE",
      desc: "Perfect for daytime practice matches, tournaments, and squad sessions.",
    },
    {
      title: "EVENING SESSION",
      window: "5:00 PM – 11:00 PM",
      price: 499,
      tag: "PRIME FLOODLIT NIGHT",
      desc: "14 floodlights active for high-intensity night matches.",
    },
  ];

  return (
    <section
      className="relative overflow-hidden py-24 border-t border-white/10"
      aria-labelledby="pricing"
    >
      <div className={SHELL}>
        <SectionHeading
          eyebrow="PRICING"
          title={<span id="pricing">PLAY MORE. PAY LESS.</span>}
          subtitle={
            compact ? undefined : "Transparent hourly rates with zero hidden convenience fees."
          }
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {pricingCards.map((c, i) => (
            <Reveal key={c.title} delay={i * 100}>
              <div className="bento-card p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-[#ccff00]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-[#ccff00]/40 bg-[#ccff00]/10 text-[#ccff00]">
                      {c.tag}
                    </span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {c.window}
                    </span>
                  </div>

                  <h3 className="mt-6 text-3xl font-black uppercase text-white font-display">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-xs text-gray-400">{c.desc}</p>

                  <div className="mt-8 flex items-baseline gap-2">
                    <span className="text-5xl sm:text-7xl font-black text-[#ccff00] font-mono neon-glow">
                      ₹<Counter to={c.price} />
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
                      / HOUR
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">
                    Up to 16 players included
                  </span>
                  <Link href="/book" className="btn-neon text-xs">
                    BOOK NOW →
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {["1 Hour Slot Increments", "Max 16 Players Per Turf", "Book Up To 7 Days Ahead"].map(
            (t, i) => (
              <Reveal as="li" key={t} delay={i * 60}>
                <div className="bento-card px-5 py-4 text-center text-xs font-extrabold uppercase tracking-[0.2em] text-gray-300">
                  {t}
                </div>
              </Reveal>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- DYNAMIC MEDIA GALLERY & HIGHLIGHTS ---------------- */

export interface GalleryMediaItem {
  id: string;
  title: string;
  category: "TURF" | "BEST_PLAYS" | "FLOODLIGHTS" | "FACILITIES";
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  createdAt?: string;
}

const CATEGORY_TABS = [
  { id: "ALL", label: "All Media" },
  { id: "BEST_PLAYS", label: "⚡ Best Plays & Highlights" },
  { id: "TURF", label: "🌱 Turf Arena" },
  { id: "FLOODLIGHTS", label: "💡 Floodlight Setup" },
  { id: "FACILITIES", label: "🛋️ Facilities & Lounge" },
];

export function Gallery() {
  const [items, setItems] = useState<GalleryMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadGallery() {
      try {
        const res = await fetch("/api/admin/gallery");
        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            setItems(data.items);
          }
        }
      } catch (err) {
        console.error("Failed to load gallery items", err);
      } finally {
        setLoading(false);
      }
    }
    loadGallery();
  }, []);

  const filteredItems = items.filter((item) =>
    activeCategory === "ALL" ? true : item.category === activeCategory,
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowLeft") {
        setOpenIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1));
      }
      if (e.key === "ArrowRight") {
        setOpenIndex((prev) => (prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, filteredItems.length]);

  const activeItem = openIndex !== null ? filteredItems[openIndex] : null;

  return (
    <section
      className="relative overflow-hidden py-24 border-t border-white/10"
      aria-labelledby="gallery"
    >
      <div className={SHELL}>
        <SectionHeading
          eyebrow="MEDIA GALLERY & HIGHLIGHTS"
          title={<span id="gallery">THE ARENA IN ACTION</span>}
          subtitle="Authentic venue snapshots, night match floodlights, and epic best play video clips from actual Gully United XLV matches."
        />

        {/* Category Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.id);
                  setOpenIndex(null);
                }}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 border ${
                  isActive
                    ? "bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.3)] scale-105"
                    : "bg-white/5 text-gray-300 border-white/10 hover:border-white/30 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl bg-white/5 animate-pulse border border-white/10"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="mt-12 p-12 text-center border border-white/10 rounded-2xl bg-white/5">
            <Film className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white uppercase font-display">
              No media found in this category
            </h3>
            <p className="text-xs text-gray-400 mt-1">Select another category or view all media.</p>
          </div>
        )}

        {/* Media Grid */}
        {!loading && filteredItems.length > 0 && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, idx) => {
              const isVideo = item.type === "VIDEO";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenIndex(idx)}
                  className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/60 aspect-[16/10] text-left transition-all duration-300 hover:border-[#ccff00]/60 hover:shadow-[0_0_25px_rgba(204,255,0,0.15)] flex flex-col justify-between p-5"
                >
                  {/* Media Background */}
                  {isVideo ? (
                    item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <video
                        src={item.url}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                      />
                    )
                  ) : (
                    <img
                      src={item.url}
                      alt={item.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}

                  {/* Gradient Overlay for Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 group-hover:from-black/95 transition-colors" />

                  {/* Top Badges */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span className="px-2.5 py-1 rounded-full text-[0.65rem] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur-md text-[#ccff00] border border-[#ccff00]/30">
                      {item.category.replace("_", " ")}
                    </span>
                    {isVideo ? (
                      <span className="px-2.5 py-1 rounded-full text-[0.65rem] font-black uppercase tracking-wider bg-[#ccff00] text-black shadow-md flex items-center gap-1">
                        <Play className="w-3 h-3 fill-black" /> BEST PLAY
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-gray-200 border border-white/20 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-gray-300" /> PHOTO
                      </span>
                    )}
                  </div>

                  {/* Center Play Icon for Videos */}
                  {isVideo && (
                    <div className="relative z-10 self-center my-auto">
                      <div className="w-14 h-14 rounded-full bg-[#ccff00]/90 text-black flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.5)] group-hover:scale-110 group-hover:bg-[#ccff00] transition-all duration-300">
                        <Play className="w-7 h-7 fill-black translate-x-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Bottom Information */}
                  <div className="relative z-10 mt-auto pt-4">
                    <h3 className="text-lg font-black uppercase text-white font-display group-hover:text-[#ccff00] transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    {item.caption && (
                      <p className="text-xs text-gray-300 mt-1 line-clamp-1 font-sans">
                        {item.caption}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox / Video Viewer Modal */}
      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/95 p-4 sm:p-8 backdrop-blur-2xl animate-fade-in"
          onClick={() => setOpenIndex(null)}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute right-6 top-6 z-50 p-3 rounded-full bg-white/10 text-white hover:bg-[#ccff00] hover:text-black transition-colors"
            aria-label="Close media viewer"
          >
            <X size={24} />
          </button>

          {/* Prev Button */}
          {filteredItems.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex((prev) =>
                  prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1,
                );
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 text-white hover:bg-[#ccff00] hover:text-black transition-colors hidden sm:flex items-center justify-center"
              aria-label="Previous item"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Next Button */}
          {filteredItems.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex((prev) =>
                  prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0,
                );
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 text-white hover:bg-[#ccff00] hover:text-black transition-colors hidden sm:flex items-center justify-center"
              aria-label="Next item"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* Media Content Box */}
          <div
            className="relative max-w-5xl w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
              {activeItem.type === "VIDEO" ? (
                <video
                  src={activeItem.url}
                  controls
                  autoPlay
                  className="w-full max-h-[75vh] object-contain rounded-2xl"
                />
              ) : (
                <img
                  src={activeItem.url}
                  alt={activeItem.title}
                  className="w-full max-h-[75vh] object-contain rounded-2xl"
                />
              )}
            </div>

            {/* Title & Caption below media */}
            <div className="mt-4 text-center max-w-2xl px-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#ccff00] text-black">
                  {activeItem.category.replace("_", " ")}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                  {activeItem.type}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white font-display">
                {activeItem.title}
              </h3>
              {activeItem.caption && (
                <p className="mt-2 text-sm text-gray-300 font-sans">{activeItem.caption}</p>
              )}
              <p className="mt-2 text-[0.7rem] uppercase tracking-widest text-gray-500 font-mono">
                Item {(openIndex ?? 0) + 1} of {filteredItems.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- INTERACTIVE CUSTOMER REVIEWS & FEEDBACK ---------------- */

export interface CustomerFeedbackItem {
  id: string;
  customer_name: string;
  customer_phone?: string;
  rating: number;
  category?: string;
  comment: string;
  created_at?: string;
}

const DEFAULT_REVIEWS: CustomerFeedbackItem[] = [
  {
    id: "seed-1",
    customer_name: "Karthik R.",
    category: "TURF_QUALITY",
    rating: 5,
    comment:
      "The turf quality is outstanding. 14 floodlights make evening games feel like a professional stadium match.",
  },
  {
    id: "seed-2",
    customer_name: "Suresh Reddy",
    category: "FACILITIES",
    rating: 5,
    comment:
      "Seamless slot booking. The pricing is super fair and the facility amenities like changing rooms are very clean.",
  },
  {
    id: "seed-3",
    customer_name: "Vamsi Krishna",
    category: "STAFF",
    rating: 5,
    comment:
      "Best turf in Kota! Synthetic pitch bounce is uniform and standard bats and gear are provided.",
  },
];

export function Testimonials() {
  const [reviews, setReviews] = useState<CustomerFeedbackItem[]>(DEFAULT_REVIEWS);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    customerName: "",
    customerPhone: "",
    rating: 5,
    category: "TURF_QUALITY",
    comment: "",
  });

  const loadFeedback = async () => {
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const data = await res.json();
        if (data.feedback && data.feedback.length > 0) {
          setReviews(data.feedback);
        }
      }
    } catch (err) {
      console.error("Failed to load feedback", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.customerName.trim() || !formState.comment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setShowReviewModal(false);
          setSubmitSuccess(false);
          setFormState({
            customerName: "",
            customerPhone: "",
            rating: 5,
            category: "TURF_QUALITY",
            comment: "",
          });
          loadFeedback();
        }, 1800);
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <section
      className="relative overflow-hidden py-24 border-t border-white/10"
      aria-labelledby="reviews"
    >
      <div className={SHELL}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <SectionHeading
              eyebrow="REVIEWS & RATINGS"
              title={<span id="reviews">PLAYER FEEDBACK</span>}
              subtitle="Authentic reviews submitted by turf players and tournament captains."
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
              <Star className="w-5 h-5 text-[#ccff00] fill-[#ccff00]" />
              <span className="text-lg font-black text-white font-display">{avgRating}</span>
              <span className="text-xs text-gray-400">/ 5.0 ({reviews.length} Reviews)</span>
            </div>

            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#ccff00] text-black font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all hover:bg-[#b8e600] hover:scale-105"
            >
              <MessageSquare size={16} />
              <span>Write a Review</span>
            </button>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((t, i) => (
            <Reveal key={t.id || t.customer_name + i} delay={i * 80}>
              <div className="bento-card p-8 h-full flex flex-col justify-between border-t-2 border-t-[#ccff00]">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-[#ccff00]">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          size={14}
                          className={
                            idx < t.rating ? "fill-[#ccff00] text-[#ccff00]" : "text-gray-600"
                          }
                        />
                      ))}
                    </div>
                    {t.category && (
                      <span className="text-[0.6rem] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                        {t.category.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-sm text-gray-300 font-medium leading-relaxed">
                    &ldquo;{t.comment}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-extrabold uppercase text-white">{t.customer_name}</p>
                    <p className="text-xs text-gray-400">Verified Player</p>
                  </div>
                  <span className="text-[0.65rem] text-[#ccff00] font-bold">{t.rating}/5 ★</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Review Submission Modal */}
      {showReviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4 sm:p-6 backdrop-blur-xl animate-fade-in"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="bento-card p-6 sm:p-10 max-w-lg w-full relative border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="absolute right-6 top-6 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 size={48} className="text-[#ccff00] mx-auto animate-bounce" />
                <h3 className="text-2xl font-black uppercase text-white font-display">
                  Review Published!
                </h3>
                <p className="text-xs text-gray-300">
                  Thank you for your feedback! Your review is now live on Gully United XLV.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest text-[#ccff00]">
                    PLAYER RATINGS
                  </span>
                  <h3 className="text-2xl font-black uppercase text-white font-display mt-1">
                    SHARE YOUR FEEDBACK
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Rate your experience at Gully United XLV Kota.
                  </p>
                </div>

                {/* Rating Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                    Overall Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, rating: star }))}
                        className="p-1 transition-transform hover:scale-125"
                      >
                        <Star
                          size={28}
                          className={
                            star <= formState.rating
                              ? "fill-[#ccff00] text-[#ccff00]"
                              : "text-gray-600"
                          }
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-bold text-[#ccff00]">
                      {formState.rating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase text-gray-400 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formState.customerName}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, customerName: e.target.value }))
                      }
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#ccff00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase text-gray-400 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={formState.customerPhone}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, customerPhone: e.target.value }))
                      }
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#ccff00] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase text-gray-400 mb-1">
                    Feedback Category
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full rounded-xl bg-black border border-white/10 px-4 py-2.5 text-xs text-white focus:border-[#ccff00] focus:outline-none"
                  >
                    <option value="TURF_QUALITY">🌱 Turf Quality & Pitch</option>
                    <option value="FLOODLIGHTS">💡 Floodlights & Night Play</option>
                    <option value="FACILITIES">🛋️ Facilities & Amenities</option>
                    <option value="STAFF">👥 Staff & Assistance</option>
                    <option value="BOOKING">⚡ Booking & Pricing</option>
                  </select>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase text-gray-400 mb-1">
                    Your Review / Comments *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Tell us about the turf, pitch bounce, lights, or staff..."
                    value={formState.comment}
                    onChange={(e) => setFormState((prev) => ({ ...prev, comment: e.target.value }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#ccff00] focus:outline-none resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-[#ccff00] text-black font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all hover:bg-[#b8e600] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  <span>{submitting ? "Publishing Review..." : "Submit Review"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- BENTO CONTACT SECTION ---------------- */

export function ContactBlock() {
  return (
    <section
      className="relative overflow-hidden py-24 border-t border-white/10"
      aria-labelledby="contact"
    >
      <div className={SHELL}>
        <SectionHeading eyebrow="LOCATION" title={<span id="contact">FIND THE ARENA</span>} />

        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          {/* Main Info Bento Card */}
          <Reveal className="lg:col-span-7">
            <div className="bento-card p-8 sm:p-10 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-black uppercase text-white font-display">
                  Gully United <span className="text-[#ccff00]">XLV</span>
                </h3>
                <address className="mt-6 space-y-4 text-sm not-italic text-gray-300">
                  <p className="flex items-start gap-3 text-white">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-[#ccff00]" />
                    {VENUE.address}
                  </p>
                  <p className="flex items-center gap-3">
                    <Phone size={18} className="shrink-0 text-[#ccff00]" />
                    <a href={`tel:${VENUE.phone}`} className="hover:text-[#ccff00] font-mono">
                      {VENUE.phone}
                    </a>
                  </p>
                  <p className="flex items-center gap-3">
                    <MessageCircle size={18} className="shrink-0 text-[#ccff00]" />
                    <a href={`mailto:${VENUE.email}`} className="break-all hover:text-[#ccff00]">
                      {VENUE.email}
                    </a>
                  </p>
                  <p className="flex items-center gap-3">
                    <Clock4 size={18} className="shrink-0 text-[#ccff00]" />
                    Mon – Sun · {VENUE.hours}
                  </p>
                </address>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href={`tel:${VENUE.phone}`} className="btn-neon text-xs">
                  CALL NOW →
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass text-xs"
                >
                  WHATSAPP →
                </a>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass text-xs"
                >
                  GET DIRECTIONS →
                </a>
              </div>
            </div>
          </Reveal>

          {/* Map Preview Card with Live Google Maps Embed */}
          <Reveal className="lg:col-span-5" delay={120}>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bento-card h-full flex flex-col justify-between min-h-[350px] relative overflow-hidden group border border-white/20 hover:border-[#ccff00]/60 transition-all duration-300 shadow-2xl"
            >
              {/* Embedded Interactive Google Map */}
              <iframe
                title="Gully United XLV Turf Location Map"
                src="https://maps.google.com/maps?q=SC%20Boys%20Residential%20School%20Road,%20Kota,%20Nellore,%20Andhra%20Pradesh%20524411&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="absolute inset-0 w-full h-full border-0 opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none filter contrast-125 brightness-90 saturate-110"
                loading="lazy"
              />

              {/* Gradient Dark Overlay for Visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

              {/* Glowing Location Pin Marker in Center */}
              <div className="relative z-10 self-center my-auto flex flex-col items-center gap-1 group-hover:scale-110 transition-transform duration-300">
                <div className="w-12 h-12 rounded-full bg-[#ccff00] text-black flex items-center justify-center shadow-[0_0_25px_rgba(204,255,0,0.8)] animate-pulse">
                  <MapPin size={24} className="fill-black text-black" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[0.6rem] font-black uppercase tracking-widest bg-black/80 text-[#ccff00] border border-[#ccff00]/40 backdrop-blur-md">
                  TURF LOCATION
                </span>
              </div>

              {/* Bottom Card Content */}
              <div className="relative z-10 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
                <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-[#ccff00]">
                  MAP LOCATION & DIRECTIONS
                </span>
                <h4 className="mt-1 text-xl sm:text-2xl font-black uppercase text-white font-display group-hover:text-[#ccff00] transition-colors">
                  SC Boys School Road, Kota
                </h4>
                <p className="mt-1 text-xs text-gray-300 font-sans">
                  Nellore District, Andhra Pradesh 524411
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ccff00] group-hover:translate-x-1 transition-transform">
                  <span>Open Live Google Maps</span>
                  <span>→</span>
                </div>
              </div>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FINAL CTA SECTION ---------------- */

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-28 border-t border-white/10 text-center">
      <div className={SHELL}>
        <Reveal>
          <h2 className="text-[clamp(3.5rem,14vw,10rem)] font-black leading-[0.82] tracking-tighter uppercase text-white font-display">
            READY TO <span className="text-[#ccff00] neon-glow">PLAY?</span>
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-4 text-gray-400 uppercase tracking-widest text-sm sm:text-base font-bold">
            Lock your hourly slot online in 60 seconds.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/book" className="btn-neon text-sm">
              BOOK YOUR TURF NOW →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS BENTO SECTION ---------------- */

const STEPS = [
  { n: "01", t: "CHOOSE DATE", desc: "Select any available date up to 7 days in advance." },
  { n: "02", t: "SELECT TIME SLOT", desc: "Pick your preferred 1-hour slot (Day/Night)." },
  { n: "03", t: "ENTER DETAILS", desc: "Provide player details for instant confirmation." },
  { n: "04", t: "CONFIRM & PLAY", desc: "Complete online payment to lock your turf." },
];

export function HowItWorks() {
  return (
    <section
      className="relative overflow-hidden py-24 border-t border-white/10"
      aria-labelledby="how"
    >
      <div className={SHELL}>
        <SectionHeading eyebrow="HOW IT WORKS" title={<span id="how">BOOK IN 4 STEPS</span>} />
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="bento-card p-6 h-full flex flex-col justify-between border-l-2 border-l-[#ccff00]">
                <div>
                  <span className="text-3xl font-black text-[#ccff00] font-mono">{s.n}</span>
                  <h3 className="mt-4 text-lg font-black uppercase text-white font-display">
                    {s.t}
                  </h3>
                  <p className="mt-2 text-xs text-gray-400 font-medium">{s.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- STICKY MOBILE BOOK BAR ---------------- */

export function MobileBookBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050505]/95 p-3 backdrop-blur-xl sm:hidden">
      <div className="flex gap-2">
        <Link href="/book" className="btn-neon flex-1 text-center text-xs">
          BOOK TURF NOW →
        </Link>
        <a
          href={`tel:${VENUE.phone}`}
          aria-label="Call Gully United XLV"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#ccff00]"
        >
          <Phone size={18} />
        </a>
      </div>
    </div>
  );
}
