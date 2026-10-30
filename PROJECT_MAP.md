# Gully United XLV — Project Map

## 1) Stack

- Framework: Next.js 15 App Router
- UI: React 19, TypeScript, Tailwind CSS, Radix UI, Lucide
- Auth: Supabase Auth via `@supabase/ssr` and `@supabase/supabase-js`
- Payments: Razorpay REST API with server-side signature verification
- Testing: Vitest
- Deployment target: Vercel (explicitly deferred in current phase per project docs)

## 2) Project structure

### App routes

- `/` — landing page, venue overview, pricing, gallery, contact, CTA
- `/book` — booking flow and slot selection
- `/venue` — venue details
- `/facilities` — facility overview
- `/pricing` — pricing page
- `/gallery` — gallery
- `/contact` — contact page
- `/auth` — auth entry page
- `/login` — login page
- `/register` — signup page
- `/forgot-password` — forgot password page
- `/reset-password` — password reset page
- `/verify-phone` — phone verification page
- `/account/security` — account security page
- `/my-bookings` — user booking history/dashboard
- `/admin` — admin dashboard home
- `/admin/login` — admin login
- `/cancellation-refund` — cancellation/refund policy page
- `/privacy` — privacy page
- `/terms` — terms page
- `/not-found` — custom 404
- `/error` — custom error page
- `/robots.txt` and `/sitemap.xml` — SEO files

### Key components

- `src/components/Hero.tsx` — landing hero
- `src/components/Nav.tsx` — navigation
- `src/components/Footer.tsx` — footer
- `src/components/Logo.tsx` — branding
- `src/components/Loader.tsx` — loading UI
- `src/components/Reveal.tsx` — reveal animation
- `src/components/SectionHeading.tsx` — common heading
- `src/components/TurfScene.tsx` — visual scene
- `src/components/FloatingAnnouncementBanner.tsx` — floating promo banner
- `src/components/FloatingDownload.tsx` — CTA download widget
- `src/components/BookingWidget.tsx` — booking UI and payment initiation
- `src/components/sections.tsx` — aggregated content sections
- `src/components/booking/*` — booking UI subcomponents
- `src/components/ui/*` — shadcn/radix-style primitives

## 3) API endpoints

### Auth

- `app/api/auth/login/route.ts` — login by email/phone + password
- `app/api/auth/register/route.ts` — sign up, validate phone/password
- `app/api/auth/logout/route.ts` — sign out
- `app/api/auth/me/route.ts` — current user lookup
- `app/api/auth/forgot-password/route.ts` — password recovery request
- `app/api/auth/reset-password/route.ts` — password reset
- `app/api/auth/change-password/route.ts` — change password
- `app/api/auth/verify-phone/route.ts` — phone verification
- `app/auth/callback/route.ts` — OAuth callback route

### Booking and availability

- `app/api/availability/route.ts` — slot availability checks
- `app/api/bookings/hold/route.ts` — create hold for a slot
- `app/api/bookings/route.ts` — booking CRUD/listing
- `app/api/payments/create-order/route.ts` — server-side Razorpay order creation
- `app/api/payments/verify/route.ts` — verify Razorpay payment response
- `app/api/webhooks/razorpay/route.ts` — Razorpay webhook receiver

### Admin

- `app/api/admin/bookings/route.ts` — admin booking queries/actions
- `app/api/admin/payments/route.ts` — payment reconciliation/refunds
- `app/api/admin/users/route.ts` — admin user management
- `app/api/admin/settings/route.ts` — admin settings
- `app/api/admin/gallery/route.ts` — gallery admin
- `app/api/admin/announcements/route.ts` — announcement admin
- `app/api/admin/coupons/route.ts` — coupon admin
- `app/api/admin/audit/route.ts` — audit log API

### Public/content

- `app/api/contact/route.ts` — contact form
- `app/api/feedback/route.ts` — feedback submission
- `app/api/coupons/validate/route.ts` — coupon validation
- `app/api/health/route.ts` — health check
- `app/api/public/health/route.ts` — public health check

## 4) Core libraries

- `src/lib/booking.ts` — in-memory booking domain prototype; includes validation and price logic
- `src/lib/booking-domain.ts` — domain booking rules used in tests
- `src/lib/domain/venue.ts` — venue rules and pricing constants in paise
- `src/lib/auth-domain.ts` — phone normalization and password validation
- `src/lib/supabase-auth-client.ts` — browser Supabase client factory
- `src/lib/supabase-auth-server.ts` — server-side authenticated client factory
- `src/lib/supabase-admin.ts` — admin client using service-role key
- `src/lib/admin-auth.ts` — admin authorization guard
- `src/lib/env.ts` — env validation helpers
- `src/lib/rate-limiter.ts` — rate-limiting helper
- `src/lib/logger.ts` — structured logging
- `src/lib/error-capture.ts` — error capture helper
- `src/lib/error-page.ts` — error page logic
- `src/lib/adapters/razorpay-adapter.ts` — REST API wrappers and HMAC verification
- `src/lib/workers/outbox-worker.ts` — outbox-style worker stub

## 5) Supabase auth flow

- Browser client is created from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server client is created from `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`.
- Admin client uses `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`.
- Auth API routes call `supabase.auth.signInWithPassword`, `signUp`, `getUser`, etc.
- Protected admin routes rely on `admin_profiles` role checks.
- Current app uses some legacy env naming patterns (`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SECRET_KEY`) alongside new publishable/secret naming.

## 6) Payment flow

- `src/lib/adapters/razorpay-adapter.ts` creates Razorpay orders, verifies signatures, and handles refund fetches.
- `app/api/payments/create-order/route.ts` resolves/creates a booking, calculates the server-side amount, and calls Razorpay.
- `app/api/payments/verify/route.ts` verifies payment signatures and updates booking/payment state.
- `app/api/webhooks/razorpay/route.ts` validates the webhook signature and processes events.
- The project stores `razorpay_order_id`, `razorpay_payment_id`, `payment_order_id`, `webhook_events`, and `refunds` in the Supabase layer.
- Payment amount is computed server-side in paise and never trusted from the browser.

## 7) Middleware and security

- `middleware.ts` adds correlation IDs and basic security headers.
- It sets:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- The app has security-oriented rules documented in `rules.md`, but the current code still has some env compatibility and server-authorization gaps that need formal validation during the next phases.

## 8) DB schema and RLS summary

### Tables

- `public.profiles`
- `public.venues`
- `public.bookings`
- `public.booking_events`
- `public.payments`
- `public.webhook_events`
- `public.refunds`
- `public.discount_coupons` / `admin_profiles` are referenced by API routes and migration files but may vary by schema state.

### Current RLS patterns

Observed in SQL migrations:

- Public venue reads are open to all.
- Customers can read their own bookings/payments.
- Admins can read booking/payment/webhook/refund data.
- Service role has broad access to finance tables.
- Unique constraints and partial indexes are used to prevent double-booking on active booking slots.

## 9) Environment variables

From `.env.example` and runtime code:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_JWKS_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `ADMIN_EMAILS`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_API_URL`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_ADMIN_PHONE`
- `WHATSAPP_BOOKING_TEMPLATE`

## 10) Current baseline notes

- This project is already a strong prototype and is not a raw empty repo.
- The current phase explicit docs say the current Vite/TanStack prototype is still the working baseline until a separate Next.js migration is approved.
- A large portion of the actual production-work required later is already sketched in migration files and adapter code.
- The project’s immediate gaps are in full validation and issue documentation, not necessarily in core service scaffolding.

## 11) Phase 1 validation status

This file was created as part of Phase 1. The repository was inspected, the app structure was mapped, and the build/lint/typecheck commands were executed for baseline capture (see terminal output from the validation step).
