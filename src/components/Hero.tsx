import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Emblem } from "./Logo";
import { TurfScene } from "./TurfScene";

const STRIP = ["Kota", "100 × 50 FT Turf", "Max 16 Players", "6 AM – 11 PM"];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState({ x: 0, y: 0 });

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
    <section
      ref={ref}
      className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pb-10 pt-28"
      aria-label="Gully United XLV"
    >
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{ transform: `translate3d(${p.x * -22}px, ${p.y * -14}px, 0) scale(1.06)` }}
      >
        <TurfScene />
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <div
          className="animate-rise"
          style={{ transform: `translate3d(${p.x * 14}px, ${p.y * 8}px, 0)` }}
        >
          <div className="flex items-center gap-3">
            <Emblem className="h-10 w-10 animate-spin-slow text-primary" />
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.4em] text-primary">
              Sports. Energy. Community.
            </span>
          </div>

          <h1 className="mt-5 text-[clamp(3.6rem,16vw,12rem)] leading-[0.8]">
            Gully
            <br />
            United
            <br />
            <span className="text-primary neon-glow">XLV</span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Premium artificial turf cricket experience in Kota.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/book" className="btn-neon arrow-slide">
              Book Your Slot <span className="arrow">→</span>
            </Link>
            <Link to="/venue" className="btn-ghost arrow-slide">
              Explore the Venue <span className="arrow">→</span>
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {STRIP.map((s) => (
              <li
                key={s}
                className="bg-background/85 px-4 py-4 text-center text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-foreground/85 backdrop-blur"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-muted-foreground">
          <span>Scroll</span>
          <ChevronDown size={14} className="animate-floaty text-primary" />
        </div>
      </div>
    </section>
  );
}
