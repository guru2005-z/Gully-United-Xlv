-- ============================================================================
-- GULLY UNITED XLV — RAZORPAY PAYMENTS MASTER SCHEMA MIGRATION
-- Migration: 20260914010000_razorpay_master_schema.sql
-- ============================================================================

-- 1. Ensure required columns on public.bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS amount_paise INT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Index for booking date and start hour availability
CREATE INDEX IF NOT EXISTS idx_bookings_date_hour ON public.bookings(date_key, start_hour);
CREATE INDEX IF NOT EXISTS idx_bookings_razorpay_order ON public.bookings(razorpay_order_id);

-- Partial unique index on active/confirmed bookings
DROP INDEX IF EXISTS idx_bookings_active_slot_unique;
CREATE UNIQUE INDEX idx_bookings_active_slot_unique ON public.bookings(venue_id, date_key, start_hour)
WHERE status IN ('PENDING', 'CONFIRMED', 'HOLD', 'BLOCKED');

-- 2. Create public.payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id UUID,
  razorpay_order_id TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  amount_paise INT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN (
      'created',
      'attempted',
      'paid',
      'failed',
      'refund_pending',
      'refunded',
      'partially_refunded'
    )
  ),
  method TEXT,
  error_code TEXT,
  error_description TEXT,
  idempotency_key TEXT UNIQUE,
  attempt_count INT NOT NULL DEFAULT 0,
  notes JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON public.payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);

-- 3. Create public.webhook_events table (Replay Guard)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_event_id TEXT UNIQUE NOT NULL,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT TRUE,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(razorpay_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON public.webhook_events(created_at DESC);

-- 4. Create public.refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  razorpay_refund_id TEXT UNIQUE NOT NULL,
  amount_paise INT NOT NULL CHECK (amount_paise > 0),
  status TEXT NOT NULL DEFAULT 'processed',
  reason TEXT,
  initiated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_razorpay_refund ON public.refunds(razorpay_refund_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Customers can read their own payments
DROP POLICY IF EXISTS "Customers can view their own payments" ON public.payments;
CREATE POLICY "Customers can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can read all payments
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()
    )
  );

-- Admins can view webhook events
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins can view webhook events" ON public.webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()
    )
  );

-- Admins can view refunds
DROP POLICY IF EXISTS "Admins can view refunds" ON public.refunds;
CREATE POLICY "Admins can view refunds" ON public.refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()
    )
  );

-- Service role full access
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.webhook_events TO service_role;
GRANT ALL ON public.refunds TO service_role;
