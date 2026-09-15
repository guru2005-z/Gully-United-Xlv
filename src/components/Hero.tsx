"use client";

import Link from "next/link";
import { ChevronDown, Zap, MapPin, ShieldCheck, Play, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TurfScene } from "./TurfScene";
import { IntroVideoSplash } from "./IntroVideoSplash";

const STATS = [
  { label: "Turf Dimensions", val: "100 × 50 FT", icon: Zap },
  { label: "Pro Lighting", val: "14 Floodlights", icon: Sparkles },
  { label: "Capacity", val: "Up to 16 Players", icon: ShieldCheck },
  { label: "Location", val: "Kota, Nellore (AP)", icon: MapPin },
];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState({ x: 0, y: 0 });
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setP({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      {showVideoModal && <IntroVideoSplash forceShow onClose={() => setShowVideoModal(false)} />}

      <section
        ref={ref}
        className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pb-12 pt-32"
        aria-label="Gully United XLV Intro"
      >
        {/* 3D Natural Green Turf Background Canvas */}
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out z-0"
          style={{ transform: `translate3d(${p.x * -20}px, ${p.y * -14}px, 0) scale(1.06)` }}
        >
          <TurfScene />
        </div>

        {/* Cinematic Stadium Dark Overlay & Edge Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#050505]/70 to-[#050505] z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-[#050505]/80 z-10 pointer-events-none" />

        {/* Subtle Ambient Lighting & Floating Particles Effect */}
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#ccff00]/10 blur-[150px] rounded-full z-10 animate-pulse-ambient" />
        <div className="particle-dust w-2 h-2 top-1/4 left-1/5 z-10" />
        <div
          className="particle-dust w-3 h-3 top-1/2 left-3/4 z-10"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="particle-dust w-1.5 h-1.5 top-2/3 left-1/3 z-10"
          style={{ animationDelay: "6s" }}
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
          <div
            className="animate-rise"
            style={{ transform: `translate3d(${p.x * 10}px, ${p.y * 5}px, 0)` }}
          >
            {/* Small Eyebrow */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#ccff00]/30 bg-black/60 px-4 py-1.5 backdrop-blur-xl shadow-[0_0_20px_rgba(204,255,0,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ccff00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ccff00]"></span>
              </span>
              <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.25em] text-[#ccff00]">
                GULLY UNITED XLV
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-4 text-[clamp(2.75rem,8vw,7rem)] font-black leading-[0.88] tracking-tight uppercase text-white drop-shadow-2xl">
              WHERE THE GAME <br />
              <span className="text-[#ccff00] neon-glow">GETS REAL.</span>
            </h1>

            {/* Supporting Subheading */}
            <p className="mt-4 text-lg sm:text-2xl font-bold uppercase tracking-wider text-gray-200">
              PLAY HARD. PLAY TOGETHER.
            </p>
            <p className="mt-2 max-w-xl text-sm sm:text-base text-gray-400 font-medium leading-relaxed">
              Experience Kota&apos;s high-performance 100 × 50 FT astro turf arena with 14 pro LED
              floodlights &amp; instant online slot booking.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/book" className="btn-neon text-xs sm:text-sm">
                BOOK YOUR TURF →
              </Link>

              <Link href="/venue" className="btn-glass text-xs sm:text-sm">
                EXPLORE THE VENUE
              </Link>

              <button
                type="button"
                onClick={() => setShowVideoModal(true)}
                className="hidden sm:inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-white/10 bg-white/5 text-xs font-extrabold uppercase tracking-wider text-white hover:text-[#ccff00] hover:border-[#ccff00]/40 transition-all backdrop-blur-md"
              >
                <Play size={14} className="fill-current text-[#ccff00]" />
                WATCH INTRO
              </button>
            </div>

            {/* Bento Feature Bar */}
            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map((s) => {
                const IconComp = s.icon;
                return (
                  <div key={s.label} className="bento-card flex items-center gap-3.5 p-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#ccff00]/30 bg-[#ccff00]/10 text-[#ccff00]">
                      <IconComp size={18} />
                    </div>
                    <div>
                      <p className="text-[0.6rem] font-extrabold uppercase tracking-widest text-gray-400">
                        {s.label}
                      </p>
                      <p className="text-sm font-black text-white font-mono">{s.val}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-8 flex items-center justify-center gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-gray-400">
            <span>Scroll to Discover</span>
            <ChevronDown size={14} className="animate-bounce text-[#ccff00]" />
          </div>
        </div>
      </section>
    </>
  );
}
