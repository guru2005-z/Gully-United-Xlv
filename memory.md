# Durable Project Memory

## Current state

- Gully United XLV is a Kota cricket turf venue.
- The visual system is black and neon lime with supplied logo and venue assets.
- @supabase/server installed and environment variables (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_JWKS_URL) configured in .env and .env.local; supabase-server skill registered in .agents/skills/supabase-server.
- Full Supabase Phone & Password Authentication implemented with E.164 normalization (+91), 12-char password policy, SSR clients (@supabase/ssr), API route handlers (/api/auth/*), and UI flows (/register, /verify-phone, /login, /forgot-password, /reset-password, /account/security).
- Razorpay integration implemented end-to-end:
  - Order creation (`/api/payments/create-order`) creates atomic slot holds, applies server-verified coupons, and creates auto-captured (`payment_capture: 1`) Razorpay orders.
  - Signature & capture verification (`/api/payments/verify`) validates HMAC-SHA256 signatures and verifies captured amount/order against Razorpay REST API.
  - Webhook reconciliation (`/api/webhooks/razorpay`) verifies raw-body `x-razorpay-signature`, guards against replays via `webhook_events` with stale-lock reclamation, and processes `payment.captured`, `payment.failed`, and `refund.processed` / `refund.created`.
  - Admin-approved refunds (`START_REFUND` in `/api/admin/bookings`) enforce server-side admin checks and idempotent refund creation.
- Dynamic Admin Media Gallery & Best Plays highlights: Admins can upload photos, video clips, and best play highlights (via file picker Data URLs or external URLs), assign categories (Best Plays, Turf Arena, Floodlights, Facilities), edit/delete gallery media, and display them dynamically with interactive lightbox video player and category filter tabs on the public `/gallery` page.
- Automatic Intro Sound Playback: IntroVideoSplash maintains sound active by default. It triggers the wicket hit impact sound effect (`/intro-sound.mp3`) at 34% video progress (wicket smash moment), followed immediately by the main intro theme music (`/intro1-sound.mp3`).

## Confirmed Policies

- Venue capacity is confirmed as a maximum of 16 players per booking.
- Customer authentication is required before booking/paying (`/book` redirects unauthenticated users to `/auth?redirect=/book`).
- Razorpay payment capture: Auto-capture full slot amount immediately on checkout (`₹299` day / `₹499` night).
- Cancellation & refund policy: Admin-approved refunds only; no self-serve automatic refunds.

## Needs Client Input

- Admin WhatsApp notification is required after confirmed booking; provider, recipient number, credentials (`WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_ADMIN_PHONE`), and template are not finalized.

## Implementation reminders

- Keep documentation synchronized with code changes.
- Never treat browser memory as a production booking source.
