# Gully United XLV Feature Catalog

This file is the feature source of truth for implementation planning. Statuses:

- **Current:** exists in the Vite/TanStack prototype.
- **Next:** approved for the Next.js/Supabase/Razorpay phase.
- **Blocked:** needs client input before implementation.
- **Release gate:** must pass before production launch.

## 1. Public Website

| Feature                           | Status  | Acceptance criteria                                                                                                    |
| --------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| Premium Gully United XLV branding | Current | Black, neon lime, white, supplied logo, supplied venue assets, responsive layout.                                      |
| Home page                         | Current | Hero, venue value proposition, CTAs, capacity, operating hours, and booking entry point.                               |
| Venue page                        | Current | Turf experience, venue details, location, and contact CTA.                                                             |
| Facilities page                   | Current | Facilities and amenities presented with real approved content/assets.                                                  |
| Pricing page                      | Current | INR 299 before 17:00 and INR 499 from 17:00, one-hour slots, max 16 players.                                           |
| Gallery page                      | Current | Supplied gallery assets, responsive media, useful alt text.                                                            |
| Contact page                      | Current | Phone, email, WhatsApp contact link, and map link.                                                                     |
| Responsive navigation             | Current | Desktop navigation and accessible mobile menu with visible focus states.                                               |
| Mobile-first UI                   | Current | No horizontal overflow at 320px; comfortable tap targets and readable content.                                         |
| Accessibility                     | Next    | Keyboard navigation, labels, focus management, semantic landmarks, contrast, reduced motion, and screen-reader errors. |

## 2. Booking Features

| Feature                   | Status         | Acceptance criteria                                                                                                |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| Date selection            | Current        | Only valid dates within the seven-day booking window can be selected.                                              |
| One-hour slot selection   | Current        | Slots run from 06:00 to 23:00 and past slots cannot be booked.                                                     |
| Capacity selector         | Current        | Player count is 1 through 16 and cannot exceed the server/domain rule.                                             |
| Server-side pricing       | Next           | Price is calculated from venue configuration on the server; browser amount is never trusted.                       |
| Availability API          | Next           | Returns sanitized slot availability for a venue/date without private customer data.                                |
| Atomic slot hold          | Next           | A short-lived hold is created transactionally before payment.                                                      |
| Double-booking protection | Next           | Database partial unique index plus transaction means concurrent users cannot book the same active slot.            |
| Slot conflict response    | Next           | Losing request receives HTTP 409 and a friendly message; UI marks the slot unavailable and refreshes availability. |
| Expiring holds            | Next           | Abandoned holds expire automatically and release slots.                                                            |
| Booking idempotency       | Next           | Repeated request with the same key returns the original booking and never creates a second hold/order.             |
| Booking reference         | Current / Next | User receives a safe public reference and can retrieve confirmed booking status.                                   |
| Booking cancellation      | Blocked        | Implement only after cancellation and refund policy is approved.                                                   |
| Guest/account model       | Blocked        | Confirm whether customers need accounts or guest-only booking.                                                     |

## 3. Razorpay Payments

| Feature                          | Status       | Acceptance criteria                                                                   |
| -------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| Razorpay order creation          | Next         | Server creates one INR order for the held booking using integer paise.                |
| Razorpay Checkout                | Next         | Client opens Checkout only with server-created public order data.                     |
| Signature verification           | Next         | Server verifies callback signature with timing-safe comparison.                       |
| Order ownership and amount check | Next         | Server verifies order ID, booking ID, amount, and currency match.                     |
| Webhook verification             | Next         | Raw body and `x-razorpay-signature` are verified before parsing or mutation.          |
| Payment state machine            | Next         | Illegal transitions are rejected; browser callback never alone confirms payment.      |
| Webhook idempotency              | Next         | Duplicate and out-of-order events are safe and auditable.                             |
| Payment pending state            | Next         | Delayed provider/database response shows pending verification, never a false failure. |
| Payment failure/retry            | Next         | Failed or cancelled payments release the hold according to policy and allow retry.    |
| Refunds                          | Blocked      | Do not implement until the client approves refund rules.                              |
| Payment reconciliation           | Release gate | Admin can identify unmatched, pending, failed, captured, and refunded payments.       |

## 4. Admin Control Room

| Feature                         | Status         | Acceptance criteria                                                               |
| ------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| Admin authentication            | Next           | Protected by server-side authentication and role checks.                          |
| Admin authorization             | Next           | Every admin route, API, action, export, and report checks role server-side.       |
| Booking list                    | Current / Next | Authorized admins can search, filter, paginate, and inspect safe booking details. |
| Block/unblock slots             | Current / Next | Admin slot blocks are transactional, audited, and unavailable to customers.       |
| Booking status actions          | Next           | Cancel, complete, no-show, and other changes follow a legal state machine.        |
| Today statistics                | Next           | Bookings, revenue, players, occupancy, payment status, and cancellations.         |
| Week statistics                 | Next           | Indexed, venue-timezone-aware aggregates and charts.                              |
| Month statistics                | Next           | Indexed, venue-timezone-aware aggregates and charts.                              |
| Year statistics                 | Next           | Indexed, venue-timezone-aware aggregates and charts.                              |
| Charts and accessible summaries | Next           | Charts have accessible summaries or equivalent data tables.                       |
| Notification delivery status    | Next           | Admin can see WhatsApp outbox status, retries, failures, and provider message ID. |
| Audit events                    | Next           | Payment, booking, refund, admin mutation, and notification events are recorded.   |
| CSV export                      | Next           | Authorized, paginated/export-safe, and personal-data handling is documented.      |

## 5. Admin WhatsApp Notifications

| Feature                        | Status       | Acceptance criteria                                                                   |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------- |
| Confirmed-booking notification | Next         | After server-confirmed payment, create one durable notification outbox event.         |
| WhatsApp provider adapter      | Next         | Provider is hidden behind a `NotificationGateway` port and can be replaced/tested.    |
| Admin recipient configuration  | Blocked      | Client must provide verified WhatsApp admin number and provider.                      |
| Approved message template      | Blocked      | Client must approve template and permitted customer fields.                           |
| Idempotent delivery            | Next         | Booking ID plus notification type prevents duplicate messages.                        |
| Retry and backoff              | Next         | Transient errors retry with bounded exponential backoff and jitter.                   |
| Fault isolation                | Release gate | WhatsApp failure never rolls back or changes booking/payment truth.                   |
| Provider security              | Release gate | Access tokens are server-only, redacted from logs, and stored in environment secrets. |

Suggested admin message after confirmation:

```text
New Gully United XLV booking confirmed
Reference: {reference}
Date: {date}
Time: {time}
Players: {players}
Amount: ₹{amount}
Payment: {payment_status}
Customer: {customer_name}
Phone: {customer_phone}
```

Send only fields approved by the client and the selected WhatsApp provider template.

## 6. Realtime and Fault Tolerance

| Feature                   | Status       | Acceptance criteria                                                                        |
| ------------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| Live slot updates         | Next         | Supabase Realtime broadcasts sanitized availability changes.                               |
| Realtime reconnect        | Next         | Bounded retry/backoff and fallback refresh handle disconnects.                             |
| Stale event handling      | Next         | Stale or duplicate events cannot make an occupied slot appear available.                   |
| Provider timeouts         | Next         | Razorpay/WhatsApp calls have timeouts and typed retryable errors.                          |
| Database failure handling | Next         | Partial failures do not claim payment success or create duplicate bookings.                |
| Global error pages        | Next         | Branded 404, 500, unauthorized, forbidden, rate-limited, maintenance, and payment states.  |
| Correlation IDs           | Next         | User-safe request IDs connect errors to redacted server logs.                              |
| Rate limiting             | Next         | Public booking, payment, lookup, admin, and webhook abuse controls return HTTP 429 safely. |
| Health/readiness checks   | Release gate | Checks reveal service health without exposing secrets or private data.                     |

## 7. SEO and Performance

| Feature               | Status       | Acceptance criteria                                                                           |
| --------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| Route metadata        | Next         | Unique server-rendered title and description for every public route.                          |
| Canonical URLs        | Next         | Canonical site URL comes from environment configuration.                                      |
| Open Graph/Twitter    | Next         | Real logo/venue assets and accurate share metadata.                                           |
| Sitemap and robots    | Next         | Public pages included; admin, payment, private booking, and errors excluded.                  |
| JSON-LD               | Next         | Verified SportsActivityLocation/LocalBusiness facts only; no invented ratings or coordinates. |
| Image optimization    | Next         | `next/image`, dimensions, responsive sizes, lazy loading, and useful alt text.                |
| Core Web Vitals       | Release gate | No avoidable layout shift; heavy 3D, charts, and Checkout are lazy-loaded.                    |
| Client bundle control | Release gate | Server components used by default; no server secrets or unnecessary client code.              |
| Query performance     | Release gate | Availability and admin reports use indexes and verified query plans.                          |

## 8. Security and Data Protection

| Feature                   | Status       | Acceptance criteria                                                                          |
| ------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| Supabase RLS              | Next         | Every exposed table has tested policies for anonymous, customer, and admin access.           |
| Secret isolation          | Next         | Supabase service role, Razorpay secret, WhatsApp token, and webhook secrets are server-only. |
| Input validation          | Next         | Zod validates every API, action, webhook, and admin input.                                   |
| CSRF/origin protection    | Next         | Mutating browser requests validate origin/CSRF according to the chosen architecture.         |
| Request/body limits       | Next         | Public endpoints reject oversized or abusive requests.                                       |
| Webhook replay protection | Next         | Provider event IDs or hashes prevent repeated mutation.                                      |
| Security headers          | Next         | CSP, HSTS in production, frame protection, referrer policy, and content-type protection.     |
| Sensitive log redaction   | Release gate | No passwords, tokens, signatures, full webhooks, or unnecessary personal data in logs.       |

## 9. Testing Features

| Test area           | Status       | Required coverage                                                                                 |
| ------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| Domain unit tests   | Next         | Pricing, dates, slot boundaries, capacity 16, validation, money, and state transitions.           |
| Repository tests    | Next         | Queries, idempotency, expired holds, cancellations, and error mapping.                            |
| SQL tests           | Release gate | Constraints, RLS, partial unique index, concurrent transactions, migrations, and EXPLAIN plans.   |
| Payment tests       | Release gate | Signatures, wrong amount/order, duplicate callbacks, webhooks, failures, timeouts, and refunds.   |
| Notification tests  | Release gate | Idempotency, retries, provider timeout, invalid recipient, and worker crash recovery.             |
| API tests           | Next         | Request validation, auth, status codes, rate limits, and safe errors.                             |
| E2E browser tests   | Release gate | Two users racing for one slot, payment states, realtime updates, mobile booking, and admin flows. |
| Accessibility tests | Next         | Keyboard, focus, labels, screen readers, contrast, reduced motion, and error announcements.       |
| Secret/build scan   | Release gate | No secrets in git, browser bundles, generated output, logs, or error pages.                       |

## 10. Delivery Phases

1. **Current prototype:** stabilize existing Vite/TanStack UI and pure booking rules.
2. **Next.js foundation:** migrate routes, shared domain code, error pages, metadata, and tests.
3. **Supabase:** schema, migrations, RLS, indexes, transactions, holds, and booking APIs.
4. **Razorpay:** orders, signatures, webhooks, state machine, idempotency, and test mode.
5. **WhatsApp:** durable outbox, provider adapter, admin message, retries, and delivery status.
6. **Realtime/admin:** live availability, analytics, charts, audit events, and operational controls.
7. **Release readiness:** security, SEO, performance, accessibility, fault tolerance, E2E, SQL, and load tests.
8. **Deployment:** one-click deployment only after all release gates pass and client policies are approved.

## 11. Client Decisions Still Required

- Refund and cancellation policy.
- Payment capture policy: automatic capture or authorized-then-captured flow.
- Guest booking or customer accounts.
- WhatsApp provider and verified admin recipient number.
- Approved WhatsApp message template and customer fields.
- Notification behavior for payment failure, cancellation, refund, and no-show.
- Production domain and final public business details.
