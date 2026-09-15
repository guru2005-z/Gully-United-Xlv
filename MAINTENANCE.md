# GULLY UNITED XLV — SYSTEM MAINTENANCE & OPERATIONAL GUIDE

This document details system architecture, database migrations, security roles, payment webhooks, rate limiting, and operational procedures for Gully United XLV.

---

## 1. Environment & Architecture Overview

- **Framework**: Next.js 15 App Router (`app/`)
- **Styling**: Tailwind CSS v4 + Vanilla CSS Design System (`src/styles.css`, Dark Neon `#CCFF00`)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Payment Processing**: Razorpay Server-Authoritative Order Creation & Webhooks
- **Authentication**: Supabase Auth (Email + Google OAuth + RLS Security Definer Role Validation)

---

## 2. Database Migrations & Security Definer Functions

All database migrations are stored chronologically in `supabase/migrations/`:

- `20260913010000_production_readiness_schema.sql`
- `20260914000000_super_admin_suite.sql`
- `20260914010000_razorpay_master_schema.sql`
- `20260914020000_full_hardening_schema.sql`

### Core Security Definer Function: `public.has_role(required_role text)`

```sql
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = required_role
  );
END;
$$;
```

This prevents recursive RLS evaluations and ensures non-admin users cannot bypass access controls.

---

## 3. Server-Authoritative Money & Razorpay Webhooks

### Payment Flow Principles

1. **Server Pricing Computation**: All prices are calculated on the server in integer paise (e.g. ₹499 -> `49900` paise) inside `app/api/bookings/route.ts`. The browser never passes an amount.
2. **Double Booking Guard**: Unique partial index `idx_active_bookings_unique_slot` prevents overlapping active bookings on `(booking_date, start_hour)`.
3. **Webhook Verification**: Webhook payloads are validated using `crypto.createHmac("sha256", webhookSecret)` inside `app/api/webhooks/razorpay/route.ts`.
4. **Idempotency**: Webhook events are logged in `webhook_events(razorpay_event_id)` to ensure duplicate events return `200 OK` without re-executing actions.

---

## 4. Rate Limiting & Anti-Spam Safeguards

- **Contact Form**: `app/api/contact/route.ts` implements honeypot inspection (`website` field must be empty) and IP rate limiting (maximum 5 submissions per 10 minutes per IP).
- **Public Health Probe**: `app/api/public/health/route.ts` provides real-time health metrics including database latency, server timestamp, and Razorpay readiness.

---

## 5. Maintenance Commands & Code Quality Verification

Run these commands to verify system health prior to deployments:

```bash
# 1. Type Check (0 TypeScript errors required)
npx tsc --noEmit

# 2. Automated Test Suite
npm run test

# 3. Production Build Pass
npm run build
```

---

## 6. Emergency Admin & Operations Procedures

### Promoting a User to Admin

To grant admin privileges to a user in Supabase SQL editor:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_HERE>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Manual Slot Blocking

Admins can manually block slots from `/admin` or via SQL:

```sql
INSERT INTO public.blocked_slots (block_date, start_hour, reason)
VALUES ('2026-09-15', 18, 'Emergency Floodlight Repair');
```
