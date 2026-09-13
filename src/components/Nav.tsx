import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { VENUE } from "@/lib/booking";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/book", label: "Book a Turf" },
  { to: "/venue", label: "The Venue" },
  { to: "/facilities", label: "Facilities" },
  { to: "/pricing", label: "Pricing" },
  { to: "/gallery", label: "Gallery" },
  { to: "/contact", label: "Contact" },
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "border-b border-border bg-background/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav
          aria-label="Main"
          className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto]"
        >
          <Link to="/" className="min-w-0" aria-label="Gully United XLV home">
            <Logo />
          </Link>

          <ul className="hidden items-center justify-center gap-7 lg:flex">
            {LINKS.map((l) => {
              const active = pathname === l.to;
              return (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className={`relative text-[0.78rem] font-extrabold uppercase tracking-[0.16em] transition-colors ${
                      active ? "text-primary" : "text-foreground/75 hover:text-primary"
                    }`}
                  >
                    {l.label}
                    <span
                      className={`absolute -bottom-2 left-0 h-0.5 bg-primary transition-all duration-300 ${
                        active ? "w-full" : "w-0"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-end gap-2">
            <Link to="/book" className="btn-neon arrow-slide hidden text-xs sm:inline-flex">
              Book Now <span className="arrow">→</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-primary transition-colors hover:bg-primary hover:text-primary-foreground lg:hidden"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen mobile navigation */}
      <div
        className={`fixed inset-0 z-40 bg-background transition-opacity duration-300 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="grain-lines flex h-full flex-col justify-center gap-1 px-6 pt-20">
          {LINKS.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              className="display block border-b border-border/60 py-3 text-[clamp(2rem,10vw,3.2rem)] text-foreground transition-colors hover:text-primary"
              style={{
                animation: open ? `rise 0.5s ${i * 55}ms cubic-bezier(.2,.8,.2,1) both` : undefined,
              }}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/book" className="btn-neon arrow-slide text-sm">
              Book Your Slot <span className="arrow">→</span>
            </Link>
            <a href={`tel:${VENUE.phone}`} className="btn-ghost text-sm">
              <Phone size={16} /> Call
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
