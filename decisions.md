# Architecture Decisions

## 2026-09-13: Keep the current app as the active phase

The repository is currently a Vite/TanStack React prototype. Work remains in this stack until the Next.js migration is explicitly started. Deployment is deferred.

## 2026-09-13: Preserve booking rules from source

The current source is the reference for hours, rates, date window, statuses, and validation until client questions are resolved. The public capacity conflict is recorded in `PRD.md` rather than guessed.

## 2026-09-13: Backend invariants are mandatory later

The eventual Supabase/Razorpay implementation must use a database-level active-slot uniqueness rule plus expiring holds, server-side price computation, verified Razorpay webhooks, and server-side admin authorization. UI checks are supplementary only.

## 2026-09-13: Confirm venue capacity

The venue capacity is locked to a maximum of 16 players per booking. The shared booking constant and future backend validation must use 16.

## 2026-09-13: Notify admin after confirmed booking

The later backend must send the admin a WhatsApp notification after server-confirmed payment/booking state. Use an approved WhatsApp Business/provider API from server-side code, not a browser `wa.me` link. Notification delivery must be idempotent, retried through a durable outbox or equivalent, and must never block or roll back a confirmed booking. The admin recipient, provider, credentials, and message template remain client configuration inputs.
