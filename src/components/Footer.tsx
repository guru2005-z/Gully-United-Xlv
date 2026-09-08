import { Link } from "@tanstack/react-router";
import pattern from "@/assets/brand-pattern.jpg";
import { Emblem } from "./Logo";
import { VENUE } from "@/lib/booking";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/book", label: "Book" },
  { to: "/venue", label: "Venue" },
  { to: "/facilities", label: "Facilities" },
  { to: "/pricing", label: "Pricing" },
  { to: "/gallery", label: "Gallery" },
  { to: "/contact", label: "Contact" },
] as const;

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      <img
        src={pattern}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={1024}
        height={1024}
        className="pointer-events-none absolute -right-24 -top-24 w-[520px] opacity-[0.07]"
      />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Emblem className="h-14 w-14 text-primary" />
            <h2 className="mt-6 text-[clamp(3rem,11vw,7rem)] leading-[0.82]">
              Gully
              <br />
              United
              <br />
              <span className="text-primary">XLV</span>
            </h2>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.4em] text-muted-foreground">
              Sports. Energy. Community.
            </p>
          </div>

          <nav aria-label="Footer">
            <h3 className="text-sm tracking-[0.3em] text-primary">Explore</h3>
            <ul className="mt-5 space-y-3">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm font-bold uppercase tracking-[0.15em] text-foreground/70 transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-sm tracking-[0.3em] text-primary">Contact</h3>
            <address className="mt-5 space-y-3 text-sm not-italic text-muted-foreground">
              <p className="text-foreground">{VENUE.address}</p>
              <p>
                <a href={`tel:${VENUE.phone}`} className="transition-colors hover:text-primary">
                  {VENUE.phone}
                </a>
              </p>
              <p>
                <a href={`mailto:${VENUE.email}`} className="break-all transition-colors hover:text-primary">
                  {VENUE.email}
                </a>
              </p>
              <p>Monday – Sunday · {VENUE.hours}</p>
            </address>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Gully United XLV. All Rights Reserved.</p>
          <Link to="/admin" className="transition-colors hover:text-primary">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
