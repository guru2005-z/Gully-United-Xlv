# Architecture Decisions

## 2026-09-13: Keep the current app as the active phase

The repository started as a Vite/TanStack React prototype and has been migrated toward Next.js App Router with Supabase and Razorpay integration. Deployment remains deferred until explicitly requested.

## 2026-09-13: Preserve booking rules from source

The current source is the reference for hours, rates, date window, statuses, and validation until client questions are resolved.

## 2026-09-13: Backend invariants are mandatory later

The Supabase/Razorpay implementation must use a database-level active-slot uniqueness rule plus expiring holds, server-side price computation, verified Razorpay webhooks, and server-side admin authorization. UI checks are supplementary only.

## 2026-09-13: Confirm venue capacity

The venue capacity is locked to a maximum of 16 players per booking. The shared booking constant and backend validation must use 16.

## 2026-09-13: Notify admin after confirmed booking

The backend must send the admin a WhatsApp notification after server-confirmed payment/booking state. Use an approved WhatsApp Business/provider API from server-side code, not a browser `wa.me` link. Notification delivery must be idempotent, retried through a durable outbox or equivalent, and must never block or roll back a confirmed booking. The admin recipient, provider, credentials, and message template remain client configuration inputs.

## 2026-09-15: Razorpay checkout fails closed without credentials

Razorpay order creation must never generate mock orders when credentials are missing. The API returns a configuration error until `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID` are configured. Payment verification also requires the Razorpay order ID and stored amount to match the target booking.

## 2026-10-30: Razorpay live mode, auto-capture, and admin-only refunds

- **Environment**: Razorpay connects in Live Mode (`rzp_live_*`) for production checkout.
- **Capture Policy**: Full slot amount (`₹299` day / `₹499` night, minus any validated promo discount) is auto-captured immediately upon checkout (`payment_capture: 1`).
- **Cancellation & Refund Policy**: Refunds are admin-approved only (`START_REFUND` in `/api/admin/bookings` with server-side admin authorization and Razorpay Refunds API). Customers cannot trigger self-serve automatic refunds.
