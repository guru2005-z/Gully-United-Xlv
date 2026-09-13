# Gully United XLV Production-Readiness Implementation Specification

This document is the single implementation brief for the later migration to Next.js, Supabase, Razorpay, SEO, and production operations. It must be implemented in phases. Do not build the entire system in one pass.

Current business rules:

- Venue: Gully United XLV, Kota.
- One-hour turf slots from 06:00 through 23:00.
- Maximum 16 players per booking.
- INR 299 before 17:00 and INR 499 from 17:00.
- Booking window: seven days ahead unless changed in the approved requirements.
- Deployment is allowed only after every acceptance check in this document passes.

## SOLID architecture and implementation patterns

Use a pragmatic Clean/Hexagonal Architecture. Keep the domain independent from Next.js, Supabase, Razorpay, WhatsApp, and browser APIs.

- **Single Responsibility:** Route handlers translate HTTP; use cases coordinate workflows; domain modules enforce booking/payment rules; repositories persist data; adapters call external providers; presenters shape safe responses.
- **Open/Closed:** Add a new payment or messaging provider by implementing a port and composing it at the server boundary. Do not change booking rules for provider changes.
- **Liskov Substitution:** Real Razorpay and test payment gateways must obey identical typed contracts, idempotency behavior, timeout behavior, and error categories.
- **Interface Segregation:** Use focused ports: `BookingRepository`, `PaymentGateway`, `NotificationGateway`, `OutboxRepository`, `Clock`, `IdGenerator`, `IdempotencyStore`, `RateLimiter`, and `Logger`.
- **Dependency Inversion:** Application services depend on ports, never directly on Supabase clients, Razorpay SDK objects, fetch, Date, or process environment variables.

Required boundaries and patterns:

1. **Domain layer:** Pure entities, value objects, money in paise, business rules, booking/payment state machines, and legal transition functions.
2. **Application layer:** Explicit use cases such as `CreateHold`, `CreateRazorpayOrder`, `ConfirmPayment`, `ProcessWebhook`, `CancelBooking`, `ExpireHolds`, `BuildAdminReport`, and `DispatchNotification`.
3. **Infrastructure layer:** Supabase repositories, SQL transaction functions, Razorpay adapter, WhatsApp adapter, durable outbox worker, rate limiter, clock, logger, and telemetry adapters.
4. **Transport layer:** Next.js route handlers/server actions that validate input, authorize the actor, call one use case, and map typed errors to documented status codes.
5. **Composition root:** One server-only module creates adapters and injects them into use cases. Do not use a service locator or instantiate providers in domain/application code.
6. **Repository pattern:** All database access is typed and centralized. Use database transactions/functions for slot locking and payment state changes.
7. **Adapter pattern:** Razorpay and WhatsApp SDK/API details stay behind provider ports. Test doubles must be deterministic and network-free.
8. **Outbox pattern:** Confirmed booking plus notification event commits atomically; workers retry external messages without changing booking truth.
9. **Result/error pattern:** Use typed domain errors and stable error codes. Convert them to HTTP responses only at the route boundary.
10. **Functional core, imperative shell:** Keep pricing, date rules, status transitions, and conflict decisions pure and directly unit-tested.

Do not create abstractions for their own sake. Every abstraction must protect a business invariant, isolate an external dependency, reduce duplication, or make a failure mode testable. Avoid global mutable state, circular dependencies, duplicated schemas, hidden retries, and business rules inside React components.

## Master Agent Prompt

```text
You are the lead production engineer for Gully United XLV. Migrate the current Vite/TanStack React prototype to Next.js App Router with strict TypeScript, Supabase Postgres/Auth/Realtime, and Razorpay. Preserve the existing design, assets, routes, content, booking rules, and accessibility. Work phase by phase and stop after each phase to run its focused tests.

Do not claim production readiness when a check is skipped. Do not put secrets in client code. Do not trust browser prices, availability, payment callbacks, roles, or booking status. Every business invariant must be enforced on the server and, where possible, in the database.

Use the implementation phases and acceptance criteria below exactly. Before changing a requirement, data model, public route, payment/refund rule, dependency, or folder structure, append a dated decision to decisions.md and update the relevant project documentation.
```

## Phase 1: Next.js foundation and safe boundaries

```text
1. Create the Next.js App Router structure with strict TypeScript. Use server components by default and client components only for interactive controls.
2. Migrate all public routes: home, book, venue, facilities, pricing, gallery, contact, and admin.
3. Preserve the current black/neon-lime Gully United XLV design and supplied assets. Use next/image with dimensions and useful alt text.
4. Add typed shared domain modules for venue rules, booking states, money in paise, date/time handling, validation, and error codes.
5. Add route-level loading, error, not-found, and payment result pages. Never expose stack traces or secrets to users.
6. Add a server-only environment validator. Separate NEXT_PUBLIC values from server-only Supabase and Razorpay secrets.
7. Add security headers and a CSP compatible with Next.js, Supabase, Razorpay Checkout, fonts, and image sources. Keep the policy documented and tested.
8. Add request correlation IDs and structured server logs that exclude phone numbers, emails, tokens, payment signatures, and secret values.
9. Keep the current public booking contract stable while replacing browser-only assumptions with service interfaces.
10. Run strict typecheck, lint, unit tests, and production build before continuing.
```

Acceptance criteria:

- All public routes render server-side without hydration warnings.
- A client component cannot import a service-role key, Razorpay secret, or server-only module.
- Invalid route and runtime failures show useful branded error pages.
- No existing user-facing page loses its content or supplied imagery.

## Phase 2: Supabase schema, RLS, and transactional booking

```text
Implement Supabase migrations and server APIs. Use PostgreSQL transactions and database functions for invariants that cannot be safely implemented as separate browser requests.

Tables:
- venues: id, name, timezone, address, phone, email, open_hour, close_hour, max_players, day_rate_paise, night_rate_paise, night_from_hour, advance_days, created_at, updated_at.
- bookings: id, public_reference, venue_id, customer_name, customer_phone, customer_email, players, booking_date, start_hour, end_hour, amount_paise, currency, status, payment_status, hold_expires_at, razorpay_order_id, razorpay_payment_id, payment_method, cancellation_reason, created_at, updated_at.
- booking_events: id, booking_id, event_type, actor_id, provider_event_id, payload_hash, metadata, created_at.
- admin_profiles: user_id, role, created_at, updated_at.
- notification_outbox: id, event_type, booking_id, recipient, provider_message_id, idempotency_key, attempts, next_attempt_at, status, last_error, created_at, updated_at.
- rate_limit_events or an approved external rate-limit store.

Required database constraints and indexes:
1. CHECK players BETWEEN 1 AND 16.
2. CHECK start_hour >= 6 AND end_hour = start_hour + 1 AND end_hour <= 23.
3. CHECK amount_paise >= 0 and currency = 'INR'.
4. CHECK booking_date is within the allowed server policy when creating a booking.
5. Add a partial unique index preventing two active holds/bookings for the same venue_id, booking_date, and start_hour. Active states must include HOLD, PAYMENT_PENDING, PAID, CONFIRMED, and BLOCKED. CANCELLED, EXPIRED, and FAILED must release the slot.
6. Add indexes for venue/date/start_hour/status, public_reference, payment provider IDs, created_at, and booking_date. Use EXPLAIN to verify availability and admin queries use indexes.
7. Store all money as integer paise. Never use floating point for money.

Atomic slot flow:
1. The server validates the request and derives the amount from the venue rules.
2. In one transaction, insert a short-lived HOLD with hold_expires_at. The partial unique index is the final conflict guard.
3. If the insert conflicts, return a typed SLOT_UNAVAILABLE result with HTTP 409. Never return a generic 500 for a normal race.
4. Create the payment order while the hold is valid. If order creation fails, expire/release the hold safely.
5. Confirm only after verified payment. Expired holds are cleaned by a scheduled job and also ignored by the active-slot query.
6. Use idempotency keys on booking creation. Replaying a request returns the original booking without a second hold or order.
7. Use a database function or transaction for status transitions. Reject illegal transitions such as CANCELLED to PAID.
8. When a booking becomes CONFIRMED, write one notification outbox event in the same transaction. The outbox event must not be sent directly from the browser or depend on a best-effort page request.

RLS:
- Enable RLS on every exposed table.
- Anonymous users may read only public venue data and sanitized availability.
- Customers may access only their own booking through a secure ownership mechanism.
- Only authenticated admins may view all bookings, create blocks, change operational status, or view analytics.
- Service-role access is server-only and never sent to the browser.

Create server route handlers or server actions for availability, hold creation, booking lookup, cancellation, admin booking operations, and expired-hold cleanup. Validate every input with Zod at the boundary.
```

Concurrency requirements:

- Two users selecting the same slot at the same time must result in exactly one successful hold.
- The losing request receives HTTP `409 Conflict`, code `SLOT_UNAVAILABLE`, and a friendly message: `That slot was just booked. Please choose another time.`
- The UI must refresh availability and show a clear cross mark/unavailable state without losing the rest of the form.
- Do not rely on polling alone for correctness. Realtime is for freshness; the database constraint is for correctness.

Required SQL tests:

- Two concurrent transactions attempting the same slot.
- A cancelled booking releasing a slot.
- An expired hold releasing a slot.
- A blocked slot remaining unavailable.
- Duplicate idempotency key returning one booking.
- Illegal status transition being rejected.
- RLS denying anonymous and non-admin access to private booking data.
- Availability and reporting queries using expected indexes with `EXPLAIN (ANALYZE, BUFFERS)`.

## Phase 3: Razorpay payment system with failure safety

```text
Implement Razorpay using the official server SDK and Razorpay Checkout. The browser is never authoritative for payment success.

Order creation:
1. Accept a validated booking request on the server.
2. Create or reuse the database HOLD transactionally.
3. Compute amount_paise on the server from date, hour, and venue configuration.
4. Create exactly one Razorpay order per idempotency key. Use INR and an internal booking reference as receipt. Do not put personal data in Razorpay notes.
5. Return only public checkout values: Razorpay key ID, order ID, amount, currency, booking reference, and customer display data.

Checkout confirmation:
1. Treat every client callback as untrusted.
2. Send razorpay_order_id, razorpay_payment_id, and razorpay_signature to a server endpoint.
3. Verify the signature using the exact documented HMAC payload and a timing-safe comparison.
4. Confirm the order belongs to the booking and the amount/currency match exactly.
5. Fetch payment/order state from Razorpay when required; do not rely only on browser callback values.
6. In one database transaction, record the payment event idempotently, update payment status, and transition the booking to CONFIRMED only for a valid captured/paid state.
7. A repeated confirmation returns the existing result and never double-confirms or creates a second booking.

Webhook endpoint:
- POST /api/webhooks/razorpay.
- Read the raw body before parsing JSON.
- Verify x-razorpay-signature using RAZORPAY_WEBHOOK_SECRET.
- Reject invalid signatures with HTTP 401 and do not mutate data.
- Store a provider event ID or payload hash for idempotent retries.
- Handle payment.captured, payment.failed, order.paid, refund.created, refund.processed, and refund.failed.
- Webhook processing must be retry-safe, ordered by valid state transitions, and safe when events arrive more than once or out of order.
- Return 2xx only when the event is safely accepted or already processed. Return 5xx for retryable internal failures without partially committing state.

Refunds and cancellation:
- Do not invent refund policy. Read the approved product decision first.
- If refund rules are missing, implement a typed pending-policy state and stop before enabling refunds.
- Refund requests must be authorized server-side, idempotent, linked to the booking/payment, and recorded in booking_events.
- Never mark a refund complete before verified provider state.

Money and secrets:
- Use integer paise only.
- Never log keys, signatures, full webhook bodies, payment secrets, or customer data.
- Do not expose RAZORPAY_KEY_SECRET or RAZORPAY_WEBHOOK_SECRET to client code.
```

Admin WhatsApp notification:

```text
After the booking transaction reaches the confirmed state, process notification_outbox through an approved WhatsApp Business/provider API.

1. Configure the provider, verified admin recipient number, credentials, and approved template through server-only environment variables.
2. Send only the minimum booking information needed by the admin: booking reference, date, time, players, amount, payment status, and required customer contact details.
3. Use an idempotency key based on booking ID and notification type. A retry must not send duplicate confirmation messages.
4. Retry transient provider errors with bounded exponential backoff and jitter. Mark permanent failures for admin dashboard retry/manual action.
5. Never fail, undo, or delay the confirmed booking solely because WhatsApp is unavailable.
6. Redact access tokens and sensitive provider responses from logs.
7. Test provider timeout, rate limit, invalid recipient, duplicate worker delivery, provider success followed by worker crash, and eventual retry.
8. Record delivery state and provider message ID for audit. Show notification status to authorized admins.
```

Payment test matrix:

- Invalid signature.
- Wrong order ID.
- Wrong payment ID.
- Wrong amount or currency.
- Payment declined.
- Checkout dismissed.
- Browser closes after payment but before callback.
- Webhook arrives before callback.
- Callback arrives before webhook.
- Duplicate callback.
- Duplicate webhook.
- Webhook arrives out of order.
- Razorpay timeout.
- Supabase timeout after provider success.
- Database failure during confirmation.
- Refund success, refund failure, and refund retry.
- Expired hold during checkout.

## Phase 4: Realtime availability and user-friendly live behavior

```text
Use Supabase Realtime only for freshness. The server/database remains authoritative.

1. Subscribe to sanitized booking availability changes for the selected venue/date.
2. Never broadcast customer name, phone, email, payment IDs, or private notes.
3. When a slot becomes unavailable, update the UI immediately with an unavailable/cross state.
4. If the user is currently paying for a slot that expires or is taken, stop checkout safely, show a friendly message, and allow selecting another slot.
5. Revalidate availability immediately before creating the hold and again before payment confirmation.
6. Handle reconnects, duplicate events, stale events, and subscription errors. Fall back to a bounded refresh with exponential backoff.
7. Do not create duplicate subscriptions on React re-renders.
8. Avoid optimistic confirmation. Optimistic UI may show a pending state only.
```

User messages:

- Slot race: `That slot was just booked by another player. Please choose another time.`
- Hold expired: `Your slot hold expired. Please select the slot again.`
- Payment pending: `Payment is being verified. Please keep this page open or check your booking status shortly.`
- Payment failed: `Payment was not completed. Your slot was released. You can try again.`
- Temporary issue: `We could not complete that request. Your payment was not confirmed. Please try again.`
- Success: `Booking confirmed. Your booking reference is {reference}.`

## Phase 5: Admin operations and analytics

```text
Build a server-authorized admin dashboard. Hiding controls is not authorization.

1. Protect every admin route, server action, route handler, export, and analytics query with server-side role checks.
2. Provide today, week, month, and year filters using the venue timezone.
3. Show total bookings, confirmed bookings, cancelled bookings, pending/expired holds, revenue in INR, players, occupancy, average booking value, payment success rate, refund totals, and no-show count.
4. Add charts for bookings by day/hour, revenue by day, slot occupancy, payment status, and cancellation/refund trends. Charts must have accessible data tables or summaries.
5. Include date-range validation, pagination, stable sorting, and indexed aggregate queries. Do not load all bookings into the browser.
6. Add booking search by safe reference, date, phone suffix, and email only for authorized admins.
7. Add operational actions for cancel, block, unblock, mark completed, and no-show with audit events and confirmation dialogs.
8. Make all admin mutations idempotent and use legal status transitions.
9. Add CSV export only after authorization and with personal-data handling documented.
```

## Phase 6: SEO, accessibility, performance, and resilience

```text
SEO:
1. Add Next.js Metadata API metadata for every public route.
2. Add canonical URLs from configuration, Open Graph, Twitter metadata, sitemap.ts, robots.ts, and LocalBusiness/SportsActivityLocation JSON-LD using only verified venue facts.
3. Mark admin, private booking, payment, and error pages noindex.
4. Use descriptive titles, headings, links, image alt text, and server-rendered meaningful content.

Accessibility:
1. Test keyboard navigation, focus management, Escape behavior, labels, errors, dialogs, mobile navigation, table semantics, and screen readers.
2. Meet WCAG AA contrast requirements.
3. Support prefers-reduced-motion.
4. Make all slot states understandable without color alone.

Performance:
1. Use server components and streaming/loading states where useful.
2. Use next/image, correct dimensions, responsive sizes, compression, and lazy loading for below-fold media.
3. Lazy-load heavy 3D, charts, and payment UI.
4. Avoid unnecessary client bundles, duplicate fetches, hydration mismatches, and N+1 queries.
5. Cache only public immutable data. Do not cache private availability, payment, or admin responses incorrectly.
6. Measure Core Web Vitals and query plans. Set budgets for JavaScript, images, and API latency.

Resilience:
1. Add timeouts, bounded retries with jitter, and circuit-breaker behavior for provider calls.
2. Make all external-provider and database mutations idempotent.
3. Use graceful degradation when Realtime is unavailable.
4. Add health/readiness checks that do not expose secrets or private data.
5. Add error reporting with redaction and correlation IDs.
6. Ensure a payment timeout never tells a user that payment failed unless provider state was checked or the booking is visibly pending.
```

## Phase 7: API contracts, status codes, and error pages

Use consistent JSON error responses:

```ts
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "That slot was just booked. Please choose another time.",
    "requestId": "safe-correlation-id"
  }
}
```

Required status codes:

- `200`: successful read or idempotent successful result.
- `201`: newly created hold, booking, or payment order.
- `202`: payment/webhook accepted for asynchronous verification.
- `400`: malformed request or invalid field values.
- `401`: unauthenticated or invalid webhook signature.
- `403`: authenticated but not authorized.
- `404`: safe reference or route not found.
- `409`: slot conflict, stale state, or invalid state transition.
- `422`: semantically invalid booking/payment input.
- `429`: rate limit exceeded, with `Retry-After`.
- `500`: unexpected application failure; do not expose internals.
- `502`: upstream provider failure.
- `503`: temporary unavailable or maintenance state.
- `504`: bounded upstream timeout.

Required pages/states:

- Global 404.
- Global error boundary with retry.
- Booking validation error.
- Slot conflict.
- Payment pending.
- Payment failed.
- Payment cancelled.
- Payment verification delayed.
- Booking confirmed.
- Unauthorized admin.
- Forbidden admin.
- Rate limited.
- Temporary maintenance.

## Phase 8: Rate limiting and abuse protection

```text
Protect public availability, hold creation, booking lookup, payment initiation, cancellation, admin login, and webhook endpoints.

1. Use a shared production-capable rate-limit store, not process memory.
2. Apply separate limits by IP, user/session, safe booking reference, and endpoint.
3. Return 429 with Retry-After and a friendly message.
4. Add request body size limits, schema limits, origin/CSRF protection where applicable, and webhook replay protection.
5. Do not rate-limit trusted internal webhook retries in a way that causes payment events to be lost; use a queue or durable retry strategy.
6. Monitor rejected requests and avoid logging sensitive payloads.
```

## Phase 9: Complete frontend and backend test plan

Frontend tests:

- Navigation and all public routes.
- Booking date, hour, capacity, email, phone, and required-field validation.
- Day/night price display.
- Loading, empty, offline, retry, slot conflict, hold expiry, and payment states.
- Realtime slot updates and reconnect behavior.
- Mobile widths 320px, 375px, 768px, 1024px, and desktop.
- Keyboard-only and accessibility checks.
- Admin filters, charts, pagination, authorization UI, and confirmation dialogs.
- No horizontal overflow or hydration warnings.

Backend/API tests:

- Every route's schema validation and status code.
- Authentication and authorization for every protected operation.
- Concurrent holds for one slot.
- Expiring holds and cancelled-slot reuse.
- Database constraints and RLS negative tests.
- Idempotent booking, order, callback, webhook, cancellation, and refund operations.
- Razorpay signature, amount, currency, order ownership, and event replay tests.
- Provider timeout, database timeout, retry, and partial-failure recovery.
- Rate limiting and request-size limits.
- Redaction of logs and absence of secrets in output.

SQL tests:

- Run migrations on a clean database.
- Run rollback or documented forward-fix verification.
- Verify all constraints, partial indexes, RLS policies, functions, triggers, and status transitions.
- Run concurrent transaction tests with multiple database connections.
- Run query-plan checks for availability and all admin report periods.
- Seed and reset test data deterministically.

Browser end-to-end tests:

- Playwright against a local app and Supabase test project.
- Use Razorpay test mode or a provider adapter with the same server contract; never use real payment credentials in tests.
- Test two simultaneous users selecting the same slot.
- Test payment cancellation, success, delayed webhook, duplicate webhook, and refresh during pending state.

## Phase 10: Observability, release gates, and one-click deployment

```text
Before deployment, add:
- Environment validation that fails clearly when required variables are missing.
- Database migration checks and a documented migration order.
- Preview/test/production environment separation.
- Secret storage through the hosting provider, never committed files.
- CI checks for format, lint, typecheck, unit tests, SQL tests, E2E tests, build, and secret scanning.
- Preview deployments for pull requests and protected production deployment approval.
- Health checks, error tracking, logs with request IDs, payment reconciliation reports, and alert thresholds.
- A rollback plan that does not silently roll back irreversible payment/provider state.
- Razorpay webhook URL, allowed origins, CSP, and Supabase redirect URLs configured per environment.

Only enable one-click production deployment after all release gates pass. Deployment is not a substitute for database migrations, webhook configuration, or payment verification.
```

## Final release checklist

- [ ] Next.js strict build passes.
- [ ] Frontend lint, typecheck, unit, accessibility, and Playwright tests pass.
- [ ] Backend API and SQL tests pass.
- [ ] Clean Supabase migrations apply successfully.
- [ ] RLS negative tests prove private data is protected.
- [ ] Database-level active-slot uniqueness prevents concurrent double-booking.
- [ ] Expiring holds release abandoned slots.
- [ ] Server computes every amount in paise.
- [ ] Razorpay signatures and webhook signatures are verified.
- [ ] Razorpay callbacks and webhooks are idempotent and replay-safe.
- [ ] Confirmed bookings enqueue one idempotent admin WhatsApp notification.
- [ ] WhatsApp notification retries are durable and do not affect booking/payment truth.
- [ ] Illegal booking/payment/refund state transitions are rejected.
- [ ] Payment timeout and delayed webhook behavior is user-friendly and accurate.
- [ ] Realtime updates never expose private data and never replace database correctness.
- [ ] Admin routes and reports are server-authorized.
- [ ] Today/week/month/year analytics use indexed queries and venue timezone.
- [ ] Rate limiting, CSRF/origin checks, body limits, and replay protection are active.
- [ ] All required status codes and branded error pages are tested.
- [ ] No secrets are present in git, browser bundles, logs, or error responses.
- [ ] SEO metadata, sitemap, robots, canonical URLs, and structured data are validated.
- [ ] Mobile booking works at 320px without horizontal scrolling.
- [ ] Observability, alerts, backups, migration process, and rollback plan are documented.
- [ ] Client has approved capacity, cancellation, refund, payment capture, login, and notification policies.
- [ ] One-click deployment is enabled only after this checklist is complete.
