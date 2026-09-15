# GULLY UNITED XLV — RAZORPAY PRODUCTION INTEGRATION & GOLIVE GUIDE

## Overview

This guide details the end-to-end Razorpay payment integration for Gully United XLV turf slot bookings. The architecture enforces server-authoritative pricing in integer **paise**, 10-minute slot holds (`HOLD` state), timing-safe HMAC-SHA256 signature verification, webhook deduplication via `webhook_events`, amount mismatch fraud prevention, and a dedicated SuperAdmin Financial Control Suite.

---

## 1. Environment Variables Configuration

In production, add the following secrets to your `.env.local` or environment provider (e.g. Vercel / Railway / Supabase Edge Functions):

```ini
# Client Checkout Key (Safe for frontend bundle)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx

# Server Adapter Keys (NEVER leak to browser or code repos)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_live_secret_key

# Webhook Verification Secret (Configured in Razorpay Dashboard)
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

> ⚠️ **CRITICAL SECURITY RULE**: Never put `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` into frontend code, client prompts, or repository commits.

---

## 2. Webhook Setup in Razorpay Dashboard

1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings** → **Webhooks** → **Add New Webhook**.
3. Set **Webhook URL**:
   `https://<YOUR-DOMAIN>/api/webhooks/razorpay`
4. Set **Secret**: Copy your `RAZORPAY_WEBHOOK_SECRET`.
5. Select the following **Active Events**:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
6. Click **Save Webhook**.

---

## 3. Financial & Security Guarantees

### A. Server-Authoritative Pricing (Paise Integers)

- Money calculations are calculated exclusively on the server (`app/api/payments/create-order/route.ts`).
- Prices are calculated in integer **paise** (`₹299` = `29900` paise, `₹499` = `49900` paise).
- Floats are strictly prohibited to prevent rounding drift.

### B. 10-Minute Atomic Slot Holds

- Creating an order issues a 10-minute hold (`status = 'HOLD'`, `payment_status = 'pending'`).
- Prevents double bookings while the user is inside the Razorpay payment modal.
- If payment fails or is dismissed, the slot expires automatically after 10 minutes unless paid.

### C. Timing-Safe HMAC-SHA256 Verification

- Client callbacks (`/api/payments/verify`) and Webhooks (`/api/webhooks/razorpay`) compute `crypto.createHmac('sha256', secret)` and verify signatures using `crypto.timingSafeEqual`.

### D. Webhook Replay Guard

- Duplicate webhook payloads are rejected via unique database constraint on `webhook_events(razorpay_event_id)`.
- If Razorpay retries a webhook, the endpoint immediately returns `200 OK` with `{ duplicate: true }` without re-executing business logic.

### E. Amount Mismatch Fraud Guard

- The webhook endpoint verifies that `payload.payment.entity.amount == stored_booking.amount_paise`.
- Mismatches log `error_code = 'AMOUNT_MISMATCH'` and set `status = 'failed'` to prevent parameter tampering.

---

## 4. Admin Control Suite Features

Access the dashboard at `/admin` (Financials & Refunds tab):

1. **Gross & Net Revenue Analytics**: View real-time revenue, refunds issued, and net earnings.
2. **Verified Razorpay Transactions Table**: Search and view all online payments, payment methods, and status badges (`paid`, `refunded`, `failed`, `created`).
3. **Instant API Refund Tool**: Issue full or partial refunds directly to Razorpay's API from the admin modal. Automatically updates booking status to `CANCELLED` and `refunded`.
4. **Razorpay Order API Reconciler**: Query live Razorpay order status by entering an `order_...` ID to compare database state against live Razorpay servers.
5. **Webhook Stream Log**: Audit all incoming webhooks, event types, duplicate flags, and delivery timestamps.

---

## 5. Verification Checklist

Before taking the system live:

- [x] Run `npm run build` — confirm zero build or TypeScript errors.
- [x] Test `GET /api/health` — confirm database and payment subsystem health reporting.
- [x] Trigger test checkout via frontend — verify slot hold creation.
- [x] Verify webhook signature validation with test event payload.
- [x] Verify admin instant refund modal.
