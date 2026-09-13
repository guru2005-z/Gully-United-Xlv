# Gully United XLV: Next.js Full-Stack Implementation Prompts

These prompts are designed to be pasted into an AI coding agent one at a time. Run them in order. The project currently uses Vite/TanStack Start, React, TypeScript, and an in-memory booking store. The target is a production-ready Next.js App Router application with Supabase, Razorpay, SEO, and responsive mobile UX.

## How to use

1. Commit or back up the current project before starting the migration.
2. Paste Prompt 1, review the migration, and make sure the app still builds.
3. Paste Prompts 2, 3, and 4 in order.
4. Give the agent real environment values only through local environment variables. Never paste secret keys into source code or chat.
5. Run the verification checklist at the end before considering the implementation complete.

## Prompt 1: Migrate the app to Next.js and TypeScript

```text
You are a senior Next.js and TypeScript engineer. Migrate this existing Gully United XLV sports venue app from Vite/TanStack Start to Next.js 15+ App Router with strict TypeScript.

Project context:
- Brand: Gully United XLV, Sports. Energy. Community.
- Location: SC Boys Residential School Road, Kota.
- Phone: 9390817811. Email: Gullyunitedxlv@gmail.com.
- Current source is under src/ and uses React, Tailwind CSS, Radix UI, Lucide, and TanStack Router.
- Existing booking rules are in src/lib/booking.ts: venue hours 06:00-23:00, one-hour slots, 7-day booking window, maximum 16 players, day price INR 299, night price INR 499 from 17:00, and statuses PENDING/CONFIRMED/CANCELLED/COMPLETED/NO_SHOW/BLOCKED.
- Preserve the existing Gully United logo, venue assets, visual identity, content, routes, and user-facing behavior unless a change is required for Next.js.

Implementation requirements:
1. Create a clean Next.js App Router structure with app/, components/, lib/, types/, public/, and supabase/ where appropriate. Use server components by default and add "use client" only for interactive UI.
2. Convert every existing route into an App Router route. Preserve these pages: home, book, venue, facilities, pricing, gallery, contact, and admin.
3. Replace Vite-specific APIs, TanStack Router setup, and client-only assumptions with Next.js equivalents. Use next/link, next/image, metadata, loading.tsx, error.tsx, and not-found.tsx where useful.
4. Preserve the existing design language: black, neon lime, white, premium sports-tech, high contrast, bold condensed headings, and uploaded assets. Do not replace real assets with invented photos.
5. Keep booking calculations and Zod validation in shared, testable TypeScript modules. Do not trust price, date, player count, or availability values sent by the browser.
6. Create typed service boundaries so database and payment code can be added without putting secrets in client components.
7. Add a typed env helper that validates required server variables at runtime and clearly distinguishes NEXT_PUBLIC_* values from server-only secrets.
8. Update package.json, tsconfig, ESLint, and PostCSS/Tailwind for Next.js. Remove obsolete Vite/TanStack dependencies only when they are no longer used.
9. Add tests for priceForHour, valid booking dates, slot boundaries, phone/email validation, and player limits. Use the test runner already present; if none exists, add Vitest with a minimal configuration.
10. Add a README section documenting install, development, build, environment variables, and Supabase setup.

Security and quality:
- No secrets in git, source, logs, browser bundles, or error messages.
- Avoid any client-side admin authorization. Authorization must be checked on the server.
- Keep public APIs stable where possible and document intentional breaking changes.
- Run typecheck, lint, tests, and production build. Fix errors caused by this migration before finishing.

At the end, report changed files, commands run, remaining manual setup, and any assumptions. Do not claim the migration is complete if the production build fails.
```

## Required SOLID architecture and patterns

Apply these principles consistently in every phase:

- **Single Responsibility:** Keep route handlers thin. Separate validation, authorization, booking rules, pricing, repositories, payment providers, notification providers, and presentation.
- **Open/Closed:** Add payment or notification providers through interfaces and adapters, without rewriting booking use cases.
- **Liskov Substitution:** Razorpay, a test payment adapter, and future providers must satisfy the same typed payment contract and failure semantics.
- **Interface Segregation:** Prefer small ports such as `BookingRepository`, `PaymentGateway`, `NotificationGateway`, `Clock`, `IdempotencyStore`, and `RateLimiter` over one large service.
- **Dependency Inversion:** Domain/application services depend on ports. Supabase, Razorpay, WhatsApp, logging, and time are infrastructure adapters injected at the server boundary.

Use these patterns where they solve a real problem:

- **Clean Architecture / Hexagonal Architecture:** `domain` contains rules and state transitions; `application` contains use cases; `infrastructure` contains Supabase/Razorpay/WhatsApp adapters; route handlers compose dependencies.
- **Repository Pattern:** Keep database queries behind typed repositories. Do not scatter Supabase calls through React components or route handlers.
- **Use Case / Command Handler Pattern:** Implement `CreateBookingHold`, `CreatePaymentOrder`, `ConfirmPayment`, `ProcessRazorpayWebhook`, `CancelBooking`, and `SendBookingNotification` as explicit application operations.
- **State Machine Pattern:** Define legal booking and payment transitions in one module. Reject illegal transitions consistently.
- **Outbox Pattern:** Commit booking truth and notification/payment events atomically, then process external notifications asynchronously and idempotently.
- **Adapter Pattern:** Wrap Razorpay and the selected WhatsApp provider behind ports so test doubles can be used without real network calls.
- **Strategy Pattern:** Encapsulate pricing, refund policy, rate limiting, and retry policy behind small strategies selected by configuration.
- **Factory/Composition Root:** Construct server dependencies in one server-only composition module. Never instantiate providers inside domain code.
- **Result/Error Pattern:** Return typed success and domain-error results from application services; map them to HTTP status codes only at the transport boundary.
- **Functional Core, Imperative Shell:** Keep date validation, pricing, transitions, and conflict decisions pure; isolate I/O, time, randomness, and network calls.

Do not introduce a pattern merely for ceremony. Each abstraction must have a clear owner, typed contract, focused test, and a reason that it protects a business invariant or makes a provider replaceable. Avoid service locators, global mutable state, circular dependencies, anemic duplicate models, and duplicated validation logic.

## Prompt 2: Add Supabase authentication, database, and secure booking APIs

```text
Implement the production Supabase backend for the migrated Gully United XLV Next.js app. Use @supabase/ssr and the App Router server/client patterns.

Database requirements:
1. Create SQL migrations for profiles, venues, bookings, and booking_events. Use UUID primary keys, timestamptz columns, created_at/updated_at, check constraints, and useful indexes.
2. Store booking fields for customer name, phone, email, players, date_key, start_hour, amount, booking status, payment status, payment provider/order/payment IDs, payment method, notes, and idempotency key.
3. Add a database-level uniqueness rule or exclusion-safe transaction that prevents two active bookings for the same venue/date/start_hour. CANCELLED bookings must release the slot; BLOCKED slots must remain unavailable.
4. Seed the Gully United venue and preserve the current business rules: 06:00-23:00, one-hour slots, seven-day advance window, maximum 16 players, INR 299 day rate, INR 499 night rate from 17:00.
5. Enable Row Level Security on every public table. Anonymous users may read only public venue information and availability. A customer may read only their own booking using a secure lookup mechanism. Only authenticated admins may create blocks, edit booking status, or view broad booking data.
6. Never expose the Supabase service-role key to the browser. Use a server-only Supabase admin client only inside trusted server code and route handlers.

Application requirements:
1. Implement browser/server clients using @supabase/ssr, middleware for session refresh, and secure cookie handling.
2. Add server-side Zod validation for every booking, admin, and payment callback input.
3. Add route handlers or server actions for: availability, create booking, retrieve a booking by safe reference, cancel booking according to policy, admin booking list, block slot, and update booking status.
4. Make booking creation atomic and idempotent. A repeated request with the same idempotency key must return the original booking, never create a second booking, and never charge twice.
5. Calculate the amount on the server from the selected slot. Reject client-supplied amounts that do not match.
6. Use clear typed errors and safe user-facing messages. Log only non-sensitive correlation IDs.
7. Add admin authorization based on a profiles role or a secure allowlist. Check authorization in every protected server action, not only in the UI.
8. Add tests for RLS assumptions, duplicate slot races, idempotency, invalid date windows, unauthorized admin calls, and cancelled-slot reuse.

Environment variables must be documented without values:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ADMIN_EMAILS or the chosen secure admin-role configuration

Apply migrations locally, run typecheck/lint/tests/build, and report exact manual Supabase dashboard steps still required. Never use a service-role key in a client component or NEXT_PUBLIC_ variable.
```

## Prompt 3: Implement Razorpay payments and webhook reconciliation

```text
Implement a secure Razorpay payment flow for Gully United XLV in the Next.js App Router. Use the official Razorpay Node SDK only on the server and Razorpay Checkout only from a client component after the server creates an order.

Required payment flow:
1. The client submits booking details to the server. The server validates the request, confirms the slot transactionally, computes the INR amount, creates a pending booking, and creates a Razorpay order with amount in paise, currency INR, a receipt tied to the booking, and notes containing only non-sensitive IDs.
2. Return only the Razorpay order ID, public key ID, amount, currency, booking reference, and a short-lived public checkout payload to the browser. Never return secrets.
3. Open Razorpay Checkout on the client with customer name, email, and phone. Treat the browser success callback as untrusted.
4. Send Razorpay payment_id, order_id, and signature to a server route. Verify the signature using a timing-safe comparison and the Razorpay secret. Confirm that the order belongs to the expected booking and amount before marking the booking PAID/CONFIRMED.
5. Implement a POST webhook endpoint at /api/webhooks/razorpay. Read the raw request body, verify x-razorpay-signature before parsing, make processing idempotent by event/payment ID, and handle payment.captured, payment.failed, order.paid, refund.created, and refund.processed as appropriate.
6. Webhooks must be safe to retry and must not double-confirm, double-refund, or overwrite a newer state. Store payment events for audit and reconciliation.
7. Add expiry/cleanup handling for unpaid pending bookings so abandoned checkout attempts do not permanently consume slots. Make the policy explicit and configurable.
8. Add a verified booking success page that reads server-confirmed booking state, not a client query parameter alone. Add failure, cancelled, and retry states.
9. Use integer paise calculations only. Never use floating-point money arithmetic. Display currency with Intl.NumberFormat for en-IN.
10. Do not mark a booking CONFIRMED merely because Razorpay Checkout closed or because a client callback says success.
11. After a server-confirmed booking, enqueue one idempotent admin WhatsApp notification through an approved WhatsApp Business/provider API. Use a durable outbox or equivalent retry mechanism so provider failure never rolls back the confirmed booking. Do not use a browser `wa.me` link as the backend notification mechanism.

Required server variables:
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID

Add unit tests for signature verification, invalid signatures, wrong order/amount, duplicate webhook delivery, payment failure, refund transitions, and replayed checkout confirmation. Add an integration test or documented Razorpay test-mode procedure. Update the README with dashboard webhook URL, events, secret configuration, test cards, and production checklist. Run typecheck, lint, tests, and production build.
```

## Prompt 4: Finish SEO, mobile UX, accessibility, and production verification

```text
Polish and production-harden the Gully United XLV Next.js app without changing the brand direction or inventing content.

SEO:
1. Add route-specific metadata using the Next.js Metadata API for home, book, venue, facilities, pricing, gallery, contact, and admin (noindex admin).
2. Add a canonical site URL from NEXT_PUBLIC_SITE_URL, Open Graph and Twitter metadata, descriptive titles, descriptions, and the real logo/venue image where appropriate.
3. Add app/sitemap.ts, app/robots.ts, and JSON-LD schema for SportsActivityLocation/LocalBusiness with the real name, Kota address, phone, email, opening hours, price range, and URL. Do not invent coordinates, ratings, reviews, or amenities.
4. Prevent duplicate or private booking/admin pages from being indexed. Ensure metadata is server-rendered.
5. Optimize next/image dimensions, alt text, loading priority, and formats. Do not hide meaningful content from search engines behind client-only rendering.

Mobile and accessibility:
1. Test 320px, 375px, 768px, 1024px, and desktop widths. No horizontal scrolling, clipped buttons, overlapping text, layout shift, or tiny tap targets.
2. Make the booking flow comfortable one-handed: clear steps, sticky summary only where it does not cover content, large date/slot controls, visible errors, keyboard support, and mobile-safe Razorpay Checkout behavior.
3. Make navigation accessible with a labeled menu button, focus trap for the mobile menu, Escape-to-close, visible focus states, correct landmarks, heading order, and screen-reader labels.
4. Verify color contrast, reduced-motion support, keyboard-only operation, form labels, autocomplete/inputMode, and non-color error states.
5. Add loading, empty, error, offline/network failure, payment failure, and success states. Preserve user-entered form values when a recoverable request fails.

Performance and production:
1. Keep server components server-rendered where possible, lazy-load heavy interactive/3D sections, avoid unnecessary client JavaScript, and eliminate hydration mismatches.
2. Add security headers where compatible: CSP appropriate for Razorpay/Supabase, HSTS in production, X-Content-Type-Options, Referrer-Policy, and frame protections. Document any required Razorpay CSP domains.
3. Add rate limiting or an equivalent abuse-control strategy to public booking and payment-initiation routes. Do not rely on UI controls for protection.
4. Run format, lint, strict typecheck, unit/integration tests, and production build. Use Playwright if available to test the booking flow at desktop and mobile sizes, including validation errors, slot conflicts, checkout cancellation, and confirmed payment test mode.
5. Inspect the built output for leaked secrets and accidental debug logs. Confirm that server-only modules cannot be imported by client components.
6. Update README with local setup, Supabase migrations, Razorpay test-mode configuration, and a troubleshooting section.

Finish with a concise release report: files changed, checks passed, failed checks with reasons, required dashboard configuration, and remaining risks. Do not claim payment or SEO is production-ready until the corresponding verification has actually passed.
```

## Required environment template

Create `.env.example` with names only. Never commit `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
ADMIN_EMAILS=
WHATSAPP_PROVIDER=
WHATSAPP_API_URL=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_ADMIN_PHONE=
WHATSAPP_BOOKING_TEMPLATE=
```

## Final verification checklist

- `npm run lint` passes.
- Strict TypeScript checking passes.
- Unit and integration tests pass, including duplicate-slot and duplicate-payment cases.
- Production build passes.
- Supabase migrations apply to a clean project.
- RLS blocks anonymous/admin data leakage in negative tests.
- Razorpay signature and webhook replay tests pass.
- No server secret appears in browser bundles or git history.
- Booking amount is recalculated server-side in paise.
- Mobile booking works without horizontal scrolling at 320px.
- Keyboard and screen-reader navigation works through booking and payment states.
- `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph metadata, and JSON-LD are present.
- Admin routes are authenticated and `noindex`.
- Razorpay test-mode webhook events are configured for local verification.
- Supabase Auth, local URL configuration, and database migrations are configured.
