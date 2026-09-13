# Gully United XLV Project Completion and Client Handoff

This is the master checklist for turning the current prototype into a real, client-ready, production website. Markdown files describe the work; they do not make the application production-ready by themselves. Every item below must be implemented and verified.

## 1. Current repository status

The current application is a Vite/TanStack React prototype with in-memory bookings. It is not yet the target Next.js + Supabase + Razorpay production system.

Current verified baseline:

- `npm run build` passes for the current Vite/TanStack application.
- `npm run lint` has no errors, with existing warnings documented separately.
- Booking data is currently stored in browser memory and is not safe for real multi-user booking.
- Supabase persistence, phone authentication, Razorpay payment, live availability, admin authorization, WhatsApp delivery, and production deployment are not yet implemented in the current source.

## 2. Existing project documents

These documents already define most product requirements:

- `PRD.md`: product and business requirements.
- `FEATURES.md`: feature catalog and acceptance criteria.
- `architecture.md`: stack, boundaries, and build order.
- `rules.md`: coding and security rules.
- `design.md`: visual and responsive design.
- `decisions.md`: locked decisions and unresolved policy decisions.
- `memory.md`: durable project context.
- `testing.md`: test strategy.
- `SUPABASE_PHONE_AUTH_FEATURES.md`: phone authentication specification.
- `NEXTJS_SUPABASE_RAZORPAY_IMPLEMENTATION_PROMPTS.md`: phased coding prompts.
- `NEXTJS_SUPABASE_RAZORPAY_PRODUCTION_READINESS.md`: detailed production-readiness requirements.

## 3. Previously missing coordination document

This file is the missing coordination layer. It connects the specifications to implementation order, environment configuration, release gates, and client handoff. Do not treat the project as complete until this document's implementation status is true.

## 4. Required implementation order

### Phase 0: Confirm client policies

Obtain written approval for:

- Cancellation and refund policy.
- Razorpay capture policy.
- Phone OTP provider and approved message templates.
- WhatsApp provider, verified admin recipient number, and approved admin template.
- Guest booking versus customer accounts.
- Customer notification behavior for confirmation, failure, cancellation, refund, and no-show.
- Final business address, hours, capacity, prices, and public contact details.

Do not guess any payment, refund, authentication, or notification policy.

### Phase 1: Migrate to Next.js

Implement:

- Next.js App Router with strict TypeScript.
- Existing public pages and brand assets.
- Shared domain modules for date rules, pricing, money, booking states, and validation.
- Server/client Supabase boundaries.
- Route loading, error, not-found, unauthorized, forbidden, and payment-result pages.
- SEO metadata structure.
- SOLID/hexagonal architecture from the implementation specifications.

Required checks:

```text
npm run lint
npm run typecheck
npm test
npm run build
```

### Phase 2: Supabase and authentication

Implement:

- Supabase migrations for venues, profiles, bookings, booking events, notification outbox, and rate-limit support.
- Phone/password registration and login.
- Phone OTP verification.
- Forgot password, recovery OTP, reset password, and authenticated password update.
- Secure SSR cookies and session refresh middleware.
- RLS policies and server-side admin authorization.
- Typed repositories and application use cases.

Required checks:

- Clean database migration.
- RLS positive and negative tests.
- Auth unit, API, database, and browser tests.
- No service-role key in browser output.

### Phase 3: Booking correctness

Implement:

- Availability endpoint.
- Server-computed price in integer paise.
- Transactional short-lived holds.
- Partial unique index for active venue/date/start-hour slots.
- Idempotency keys.
- Expired hold cleanup.
- Legal booking state transitions.
- HTTP 409 conflict response when another user wins the race.
- Friendly UI cross/disabled state and live availability refresh.

Required concurrency result:

- Two simultaneous users can never both hold the same active slot.
- Exactly one request succeeds.
- The other receives `409 SLOT_UNAVAILABLE`.
- A cancelled or expired hold releases the slot correctly.

### Phase 4: Razorpay

Implement:

- Server-side order creation.
- Razorpay Checkout client integration.
- Callback signature verification.
- Raw-body webhook signature verification.
- Amount/order/currency ownership checks.
- Idempotent payment callbacks and webhooks.
- Payment state machine.
- Pending, failed, cancelled, delayed, and retry UI states.
- Reconciliation records and audit events.
- Refunds only after policy approval.

Payment truth rule:

The browser is never authoritative. A booking becomes confirmed only after a server-verified Razorpay state transition.

### Phase 5: Notifications

Implement:

- Transactional notification outbox event when booking becomes confirmed.
- Server-side WhatsApp Business/provider adapter.
- Idempotency key per booking and notification type.
- Durable retry with backoff and jitter.
- Provider timeout and permanent-failure handling.
- Admin delivery status and manual retry.
- Redacted logs.

WhatsApp failure must never undo a confirmed booking or payment.

### Phase 6: Admin and realtime

Implement:

- Server-protected admin dashboard.
- Booking search, filters, pagination, blocking, cancellation, completion, and no-show actions.
- Today, week, month, and year reporting in the venue timezone.
- Revenue, occupancy, player count, payment, refund, cancellation, and no-show statistics.
- Accessible charts and data summaries.
- Supabase Realtime sanitized availability events.
- Reconnect, stale-event, duplicate-event, and fallback refresh handling.

### Phase 7: SEO, security, performance, and resilience

Implement:

- Metadata API for every public route.
- Canonical URLs, Open Graph, Twitter metadata, sitemap, robots, and verified JSON-LD.
- Noindex for admin, payment, private booking, and error pages.
- Image optimization and Core Web Vitals improvements.
- CSP, HSTS in production, frame protection, referrer policy, and content-type protection.
- Shared rate limiting, CSRF/origin checks, request size limits, timeouts, bounded retries, and correlation IDs.
- Secret scanning and redacted error reporting.

## 5. Required environment variables

Create `.env.example` with names only and configure secrets in the relevant environment manager:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
ADMIN_EMAILS=
WHATSAPP_PROVIDER=
WHATSAPP_API_URL=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_ADMIN_PHONE=
WHATSAPP_BOOKING_TEMPLATE=
AUTH_PASSWORD_MIN_LENGTH=12
AUTH_PHONE_COUNTRY=IN
AUTH_MAX_LOGIN_ATTEMPTS=
AUTH_MAX_RECOVERY_ATTEMPTS=
RATE_LIMIT_STORE_URL=
ERROR_REPORTING_DSN=
```

Never commit `.env.local`, provider tokens, private keys, webhook secrets, or service-role keys.

## 6. Required database release gates

- [ ] Migrations apply to an empty database.
- [ ] Migrations are repeatable or have a documented forward-fix strategy.
- [ ] Venue rules are seeded and use capacity 16.
- [ ] Active-slot partial unique index exists.
- [ ] Holds expire and release slots.
- [ ] Concurrent booking SQL test passes.
- [ ] RLS is enabled on every exposed table.
- [ ] Anonymous users cannot read private bookings.
- [ ] Customers cannot read another customer’s data.
- [ ] Admin access is role-checked server-side.
- [ ] Availability and reports use expected indexes and verified query plans.
- [ ] Payment and notification events are auditable and idempotent.

## 7. Required automated checks

Run all of these before client handoff:

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:unit
npm run test:api
npm run test:sql
npm run test:e2e
npm run build
npm run scan:secrets
```

If a script does not exist, add it during implementation or document the equivalent command. Do not mark the check complete because the script name is missing.

## 8. Required browser acceptance tests

Test at 320px, 375px, 768px, 1024px, and desktop widths:

- Register with valid phone, OTP, password, and display name.
- Reject invalid phone and weak password with field-level messages.
- Login with valid and invalid credentials.
- Forgot password without revealing whether an account exists.
- Verify recovery code and reset password.
- Change password while authenticated.
- Logout and verify protected pages are inaccessible.
- Two users select the same slot simultaneously.
- One user wins and one sees a 409 conflict message.
- Hold expiry releases the slot.
- Razorpay success, cancellation, timeout, delayed webhook, duplicate webhook, and failure.
- Confirmed booking produces exactly one admin WhatsApp notification.
- Temporary WhatsApp failure retries without changing booking truth.
- Admin sees daily, weekly, monthly, and yearly statistics.
- Live slot changes update without exposing private information.
- Keyboard navigation, focus, screen-reader messages, and reduced motion.
- No horizontal scrolling, clipped text, hydration warnings, or leaked secrets.

## 9. Production deployment gate

Deployment can begin only when:

- [ ] All client policy decisions are approved.
- [ ] Next.js build is the active application build.
- [ ] Supabase production project and migrations are verified.
- [ ] Razorpay production credentials are stored as secrets.
- [ ] Razorpay webhook URL, events, and secret are verified.
- [ ] WhatsApp provider and template are approved and tested.
- [ ] Production domain and redirect URLs are configured.
- [ ] Error reporting and alerts are active.
- [ ] Database backup and restore procedure is tested.
- [ ] CI blocks failed lint, typecheck, tests, SQL tests, E2E tests, build, and secret scan.
- [ ] Rollback procedure is documented without rolling back irreversible payment truth.
- [ ] Client has tested the booking journey and signed off.

## 10. Client handoff package

Provide the client with:

- Public website URL.
- Admin URL and admin onboarding instructions.
- Supabase project ownership/access instructions.
- Razorpay dashboard ownership/access instructions.
- WhatsApp provider ownership/access instructions.
- Environment variable ownership map without exposing secret values.
- Business rules and pricing reference.
- Refund/cancellation policy.
- Backup and restore instructions.
- Incident and payment-reconciliation procedure.
- User support message templates.
- Known limitations and future improvements.
- Test evidence and release checklist.

## 11. Final sign-off

The website is client-ready only when all required implementation phases are complete, all release gates are checked, production test evidence exists, payment and booking conflicts have been tested under concurrency, and the client has approved business policies and the final user journey.

A complete Markdown set is not proof of a working production website. The source code, database, provider configuration, automated tests, monitoring, and client acceptance must all be complete.
