# Durable Project Memory

## Current state

- Gully United XLV is a Kota cricket turf venue.
- The visual system is black and neon lime with supplied logo and venue assets.
- @supabase/server installed and environment variables (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_JWKS_URL) configured in .env and .env.local; supabase-server skill registered in .agents/skills/supabase-server.
- Full Supabase Authentication implemented with:
  - Google OAuth ("Continue with Google") across `/auth`, `/login`, `/register`, and `/gullyadmin/login` with PKCE code exchange in `/auth/callback`.
  - Private Admin Portal moved to `/gullyadmin` and `/gullyadmin/login` (public `/admin` returns 404 Not Found and the footer Admin link is removed). Restricted strictly to the owner (`Gullyunitedxlv@gmail.com`, `kattaguravaiah*`, `9390817811`, `9491501919`, or `admin_profiles`).
  - Admin Password Recovery via 6-digit OTP to Admin Email (`Gullyunitedxlv@gmail.com`) or Admin Phone (`9491501919` / `9390817811`) available both on `/gullyadmin/login` ("Forgot Password? Get OTP") and inside the `/gullyadmin` Website Settings tab, syncing the new password across all owner admin accounts.
  - Phone & Password Authentication with E.164 normalization (+91), 12-char password policy, SSR clients (@supabase/ssr), API route handlers (/api/auth/*), and UI flows (/register, /verify-phone, /login, /forgot-password, /reset-password, /account/security).
- Razorpay integration implemented end-to-end:
  - Order creation (`/api/payments/create-order`) creates atomic slot holds, applies server-verified coupons, and creates auto-captured (`payment_capture: 1`) Razorpay orders.
  - Signature & capture verification (`/api/payments/verify`) validates HMAC-SHA256 signatures and verifies captured amount/order against Razorpay REST API.
  - Webhook reconciliation (`/api/webhooks/razorpay`) verifies raw-body `x-razorpay-signature`, guards against replays via `webhook_events` with stale-lock reclamation, and processes `payment.captured`, `payment.failed`, and `refund.processed` / `refund.created`.
  - Admin-approved refunds (`START_REFUND` in `/api/admin/bookings`) enforce server-side admin checks and idempotent refund creation.
  - Direct Live Payment Checkout (`src/components/BookingWidget.tsx` & `/api/payments/confirm-direct`): Enables immediate live payments via the owner's official **Paytm / UPI QR Code** (`paytm.s2zq5m0@pty` — Panabaka Pradeep, `/paytm-qr.jpg`) and **Razorpay.me Live Link** (`https://razorpay.me/@panabakapradeep/<amount>`) with UTR / Payment ID verification while Razorpay API key website verification is in progress, as well as seamless in-page Razorpay Checkout once `rzp_live_*` keys are active.
- Dynamic Admin Media Gallery & Best Plays highlights: Admins can upload photos, video clips, and best play highlights (via file picker Data URLs or external URLs), assign categories (Best Plays, Turf Arena, Floodlights, Facilities), edit/delete gallery media, and display them dynamically with interactive lightbox video player and category filter tabs on the public `/gallery` page.
- Persistent Promo Coupons & Site Announcements (`src/lib/promo-store.ts`): Discount coupons and site announcement banners are persisted in Supabase (`booking_events` system store when `discount_coupons` / `site_announcements` tables are absent), so pausing or deleting a promo code in `/gullyadmin` immediately disables the coupon at checkout and automatically hides any top announcement banner referencing that promo code across all serverless instances.
- Automatic Intro Sound Playback: IntroVideoSplash maintains sound active by default. It triggers the wicket hit impact sound effect (`/intro-sound.mp3`) at 34% video progress (wicket smash moment), followed immediately by the main intro theme music (`/intro1-sound.mp3`).
- Full Mobile & Multi-Device Responsiveness: Configured mobile viewport (`viewportFit: "cover"`), 16px form inputs to prevent iOS auto-zoom, touch-action optimizations, compact mobile header with 1-tap `BOOK` and `Profile` actions, horizontal swipeable date selector & responsive live payment modal in `BookingWidget`, smart `MobileBookBar` (with Book, WhatsApp, and Call actions that hide on `/book`, `/auth`, and `/gullyadmin`), and a horizontal swipeable tab bar + mobile search bar in `/gullyadmin`.
- Multi-Slot Booking Support (`src/components/BookingWidget.tsx`, `/api/payments/confirm-direct`, `/api/payments/create-order`, `/api/payments/verify`): Players can tap and select one or multiple 1-hour time slots on the same date, view the combined base turf rate, promo discount, 3% GST (`₹3` per `₹100`), and total payable, and lock/confirm all selected slots in a single payment transaction.
- Admin Payment Method Selection & Gateway Controls (`/gullyadmin` & `/api/public/payment-config`): Admins can toggle and select the active customer checkout payment method (Both UPI QR & Razorpay, Only Paytm / UPI QR, or Only Razorpay) in Website Settings, update the merchant UPI ID, payee name, and Razorpay handle live, and choose between UPI, Razorpay, or Cash when recording offline/manual bookings in the admin panel.

## Confirmed Policies

- Venue capacity is confirmed as a maximum of 16 players per booking.
- Customer authentication is required before booking/paying (`/book` redirects unauthenticated users to `/auth?redirect=/book`).
- Razorpay payment capture: Auto-capture full slot amount immediately on checkout (`₹299` day / `₹499` night + **3% GST (`₹3` per `₹100`)**, i.e., `₹9` GST on `₹299` = `₹308` total, `₹15` GST on `₹499` = `₹514` total, or 3% of the post-discount subtotal).
- Cancellation & refund policy: Admin-approved refunds only; no self-serve automatic refunds.

## Needs Client Input

- Admin WhatsApp notification is required after confirmed booking; provider, recipient number, credentials (`WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_ADMIN_PHONE`), and template are not finalized.

## Implementation reminders

- Keep documentation synchronized with code changes.
- Never treat browser memory as a production booking source.
