# Architecture

## Current stack

- React 19, TypeScript, Vite, TanStack Router/Start, Tailwind CSS, Radix UI, Lucide, Zod.
- Booking state currently lives in `src/lib/booking.ts` memory and is not shared across users or browser sessions.

## Later target stack

- Next.js App Router and TypeScript.
- Supabase Auth, Postgres, RLS, and server-side clients.
- Razorpay server SDK and verified webhooks.
- Approved WhatsApp Business/provider API for server-side admin notifications.
- Vercel hosting, deferred until explicitly requested.

## Current structure

- `src/routes/`: route pages.
- `src/components/`: shared UI and page sections.
- `src/lib/`: booking, contact, errors, and utility logic.
- `src/supabase/`: existing function and migration area.

## 6. Build Order

1. Document and stabilize the current prototype: booking validation, pricing, slot display, admin prototype, and responsive UI.
2. Add focused tests around pure booking rules and current user flows.
3. Resolve client questions in `PRD.md` before changing business rules.
4. Plan and execute the Next.js migration without changing the public booking contract.
5. Add Supabase schema, RLS, atomic slot protection, expiring holds, and server APIs.
6. Add Razorpay order creation, server amount calculation, signature verification, and idempotent webhooks.
7. Add SEO, accessibility, performance, and mobile regression coverage.
8. Handle Vercel deployment only in a later approved phase.

## Booking flow target

The browser requests availability, the server validates and holds a slot, the server computes the amount, Razorpay payment is verified server-side, and only verified state becomes confirmed. Database constraints remain the final double-booking protection. A durable outbox event then sends one idempotent WhatsApp notification to the configured admin recipient.
