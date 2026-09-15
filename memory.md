# Durable Project Memory

## Current state

- Gully United XLV is a Kota cricket turf venue.
- The current app is a Vite/TanStack prototype with in-memory bookings.
- The visual system is black and neon lime with supplied logo and venue assets.
- Next.js, Supabase, Razorpay, and Vercel are planned later, not active in the current phase.
- @supabase/server installed and environment variables (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_JWKS_URL) configured in .env and .env.local; supabase-server skill registered in .agents/skills/supabase-server.
- Full Supabase Phone & Password Authentication implemented with E.164 normalization (+91), 12-char password policy, SSR clients (@supabase/ssr), API route handlers (/api/auth/*), and UI flows (/register, /verify-phone, /login, /forgot-password, /reset-password, /account/security).
- Dynamic Admin Media Gallery & Best Plays highlights: Admins can upload photos, video clips, and best play highlights (via file picker Data URLs or external URLs), assign categories (Best Plays, Turf Arena, Floodlights, Facilities), edit/delete gallery media, and display them dynamically with interactive lightbox video player and category filter tabs on the public `/gallery` page.
- Automatic Intro Sound Playback: IntroVideoSplash maintains sound active by default. It triggers the wicket hit impact sound effect (`/intro-sound.mp3`) at 34% video progress (wicket smash moment), followed immediately by the main intro theme music (`/intro1-sound.mp3`).

## Needs Client Input

- Venue capacity is confirmed as a maximum of 16 players per booking.
- Cancellation, refund, and payment capture rules are not finalized.
- Guest booking versus account login is not finalized.
- Admin WhatsApp notification is required after confirmed booking; provider, recipient number, credentials, and template are not finalized.

## Implementation reminders

- Keep documentation synchronized with code changes.
- Never treat browser memory as a production booking source.
