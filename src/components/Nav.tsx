"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Logo } from "./Logo";
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

  if (pathname?.startsWith("/admin")) return null;

  const links = [
    ...BASE_LINKS,
    user ? { to: "/my-bookings", label: "My Bookings" } : { to: "/auth", label: "Sign In" },
  ];

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#050505]/85 backdrop-blur-2xl border-b border-white/10 shadow-2xl"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <nav
          aria-label="Main Navigation"
          className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        >
          <Link
            href="/"
            className="flex items-center gap-3 shrink-0"
            aria-label="Gully United XLV home"
          >
            <Logo />
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="hidden items-center gap-8 lg:flex">
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

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/my-bookings"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#ccff00]/30 bg-[#ccff00]/10 text-[#ccff00] text-xs font-extrabold uppercase tracking-wider hover:bg-[#ccff00] hover:text-black transition-all"
              >
                <UserIcon size={14} />
                <span className="max-w-[100px] truncate">
                  {user.email?.split("@")[0] || "Profile"}
                </span>
              </Link>
            ) : null}

            <Link href="/book" className="btn-neon hidden text-xs sm:inline-flex">
              BOOK NOW →
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
        className={`fixed inset-0 z-40 bg-[#050505] transition-opacity duration-300 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex h-full flex-col justify-center gap-3 px-6 pt-24 pb-10">
          {links.map((l, i) => (
            <Link
              key={l.to}
              href={l.to as never}
              className={`display block border-b border-white/10 py-3 text-3xl transition-colors ${
                pathname === l.to ? "text-[#ccff00]" : "text-white hover:text-[#ccff00]"
              }`}
              style={{
                animation: open ? `rise 0.4s ${i * 45}ms cubic-bezier(.2,.8,.2,1) both` : undefined,
              }}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/book" className="btn-neon text-center text-sm w-full">
              BOOK YOUR TURF →
            </Link>
            <a href={`tel:${VENUE.phone}`} className="btn-glass text-center text-sm w-full">
              <Phone size={16} /> CALL US
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
