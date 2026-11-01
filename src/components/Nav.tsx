"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Logo } from "./Logo";
import { FloatingAnnouncementBanner } from "./FloatingAnnouncementBanner";
import { VENUE } from "@/lib/booking";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth-client";

const BASE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/book", label: "Book Turf" },
  { to: "/venue", label: "Venue" },
  { to: "/facilities", label: "Facilities" },
  { to: "/pricing", label: "Pricing" },
  { to: "/gallery", label: "Gallery" },
  { to: "/contact", label: "Contact" },
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/gullyadmin")) return null;

  const links = [
    ...BASE_LINKS,
    user ? { to: "/my-bookings", label: "My Bookings" } : { to: "/auth", label: "Sign In" },
  ];

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#050505]/95 backdrop-blur-2xl border-b border-white/10 shadow-2xl"
            : "bg-[#050505]/80 backdrop-blur-md border-b border-transparent"
        }`}
      >
        <FloatingAnnouncementBanner />
        <nav
          aria-label="Main Navigation"
          className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8"
        >
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 shrink-0"
            aria-label="Gully United XLV home"
          >
            <Logo />
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="hidden items-center gap-7 lg:flex">
            {links.map((l) => {
              const active = pathname === l.to;
              return (
                <li key={l.to}>
                  <Link
                    href={l.to as never}
                    className={`relative py-1 text-xs font-extrabold uppercase tracking-[0.18em] transition-colors ${
                      active ? "text-[#ccff00]" : "text-gray-300 hover:text-[#ccff00]"
                    }`}
                  >
                    {l.label}
                    {active && (
                      <span className="absolute -bottom-1 left-0 h-[2px] w-full bg-[#ccff00] shadow-[0_0_10px_#ccff00]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link
                href="/my-bookings"
                aria-label="My Bookings"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl border border-[#ccff00]/30 bg-[#ccff00]/10 text-[#ccff00] text-xs font-extrabold uppercase tracking-wider hover:bg-[#ccff00] hover:text-black transition-all"
              >
                <UserIcon size={14} />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user.email?.split("@")[0] || "Profile"}
                </span>
              </Link>
            ) : (
              <Link
                href="/auth"
                aria-label="Sign In"
                className="inline-flex sm:hidden items-center gap-1 px-2.5 py-2 rounded-xl border border-white/15 bg-white/5 text-white text-[0.68rem] font-extrabold uppercase tracking-wider"
              >
                <UserIcon size={14} className="text-[#ccff00]" />
              </Link>
            )}

            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-xl bg-[#ccff00] px-3 py-2 sm:px-5 sm:py-2.5 text-[0.68rem] sm:text-xs font-black uppercase tracking-wider text-black shadow-[0_0_15px_rgba(204,255,0,0.3)] hover:bg-[#d8ff33] transition-all"
            >
              BOOK <span className="hidden xs:inline ml-1">NOW</span> →
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#ccff00] transition-all hover:bg-[#ccff00] hover:text-black lg:hidden"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen mobile navigation drawer */}
      <div
        className={`fixed inset-0 z-40 bg-[#050505]/98 backdrop-blur-xl overflow-y-auto transition-opacity duration-300 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex min-h-full flex-col justify-between gap-4 px-6 pt-28 pb-24">
          <div className="flex flex-col gap-1">
            {links.map((l, i) => (
              <Link
                key={l.to}
                href={l.to as never}
                onClick={() => setOpen(false)}
                className={`display block border-b border-white/10 py-3 text-2xl sm:text-3xl transition-colors ${
                  pathname === l.to ? "text-[#ccff00]" : "text-white hover:text-[#ccff00]"
                }`}
                style={{
                  animation: open
                    ? `rise 0.35s ${i * 35}ms cubic-bezier(.2,.8,.2,1) both`
                    : undefined,
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="btn-neon text-center text-sm w-full"
            >
              BOOK YOUR TURF →
            </Link>
            <a href={`tel:${VENUE.phone}`} className="btn-glass text-center text-sm w-full">
              <Phone size={16} /> CALL US ({VENUE.phone})
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
