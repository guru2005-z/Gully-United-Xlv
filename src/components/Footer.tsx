"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Emblem } from "./Logo";
import { VENUE } from "@/lib/booking";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/book", label: "Book Turf" },
  { to: "/venue", label: "Venue" },
  { to: "/facilities", label: "Facilities" },
  { to: "/pricing", label: "Pricing" },
  { to: "/gallery", label: "Gallery" },
  { to: "/contact", label: "Contact" },
] as const;

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <footer className="relative overflow-hidden bg-[#050505] text-white">
      {/* Signature Neon Green Divider Accent Line */}
      <div className="h-[2px] w-full bg-[#ccff00] shadow-[0_0_15px_#ccff00]" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand Col */}
          <div className="lg:col-span-5">
            <Emblem className="h-12 w-12 text-[#ccff00]" />
            <h2 className="mt-4 text-4xl font-black uppercase tracking-tight text-white font-display">
              GULLY UNITED <span className="text-[#ccff00]">XLV</span>
            </h2>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-gray-400">
              KOTA&apos;S PREMIER ASTRO TURF ARENA
            </p>
          </div>

          {/* Quick Links */}
          <nav className="lg:col-span-3" aria-label="Footer Quick Links">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#ccff00]">
              NAVIGATION
            </h3>
            <ul className="mt-4 space-y-2.5">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    href={l.to}
                    className="text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-[#ccff00]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact Col */}
          <div className="lg:col-span-4">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#ccff00]">
              LOCATION &amp; CONTACT
            </h3>
            <address className="mt-4 space-y-2.5 text-xs not-italic text-gray-400">
              <p className="text-white">{VENUE.address}</p>
              <p>
                <a href={`tel:${VENUE.phone}`} className="hover:text-[#ccff00] font-mono">
                  {VENUE.phone}
                </a>
              </p>
              <p>
                <a href={`mailto:${VENUE.email}`} className="hover:text-[#ccff00]">
                  {VENUE.email}
                </a>
              </p>
              <p>Mon – Sun · {VENUE.hours}</p>
            </address>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-[0.7rem] uppercase tracking-wider text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Gully United XLV. All rights reserved.</p>
          <div className="flex flex-wrap gap-4 items-center">
            <Link href="/privacy" className="hover:text-[#ccff00]">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#ccff00]">
              Terms
            </Link>
            <span>•</span>
            <Link href="/cancellation-refund" className="hover:text-[#ccff00]">
              Cancellation Policy
            </Link>
            <span>•</span>
            <Link href="/admin/login" className="hover:text-[#ccff00]">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
