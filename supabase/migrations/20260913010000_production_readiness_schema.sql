-- Phase 2 Production Readiness Migration

-- 0. Extend booking_status ENUM with payment & hold states
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'HOLD';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'FAILED';

-- 0b. Standardize/Extend Bookings Table Columns
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_date DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS public_reference TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS amount_paise INT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_hour SMALLINT;

UPDATE public.bookings SET booking_date = date_key WHERE booking_date IS NULL AND date_key IS NOT NULL;
UPDATE public.bookings SET public_reference = reference WHERE public_reference IS NULL AND reference IS NOT NULL;
UPDATE public.bookings SET customer_phone = phone WHERE customer_phone IS NULL AND phone IS NOT NULL;
UPDATE public.bookings SET customer_email = email WHERE customer_email IS NULL AND email IS NOT NULL;
UPDATE public.bookings SET amount_paise = amount WHERE amount_paise IS NULL AND amount IS NOT NULL;
UPDATE public.bookings SET hold_expires_at = expires_at WHERE hold_expires_at IS NULL AND expires_at IS NOT NULL;
UPDATE public.bookings SET razorpay_order_id = payment_order_id WHERE razorpay_order_id IS NULL AND payment_order_id IS NOT NULL;
UPDATE public.bookings SET razorpay_payment_id = payment_id WHERE razorpay_payment_id IS NULL AND payment_id IS NOT NULL;
UPDATE public.bookings SET end_hour = start_hour + 1 WHERE end_hour IS NULL AND start_hour IS NOT NULL;

-- 1. Admin Profiles Table
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Notification Outbox Table
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  provider_message_id TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Rate Limit Store Table
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_key_expires ON public.rate_limit_events(key, expires_at);

-- 4. Active Slot Partial Unique Index on Bookings
-- Active states: HOLD, PAYMENT_PENDING, PAID, CONFIRMED, BLOCKED, PENDING
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_slot
ON public.bookings (venue_id, booking_date, start_hour)
WHERE status IN ('HOLD', 'PAYMENT_PENDING', 'PAID', 'CONFIRMED', 'BLOCKED', 'PENDING');

-- 5. Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_lookup ON public.bookings(venue_id, booking_date, start_hour, status);
CREATE INDEX IF NOT EXISTS idx_bookings_public_ref ON public.bookings(public_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_razorpay_order ON public.bookings(razorpay_order_id);

-- 6. Atomic PostgreSQL Function for Creating Booking Hold
CREATE OR REPLACE FUNCTION public.create_booking_hold(
  p_venue_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_players INT,
  p_booking_date DATE,
  p_start_hour INT,
  p_amount_paise INT,
  p_public_reference TEXT,
  p_hold_duration_minutes INT DEFAULT 10
)
RETURNS TABLE (
  booking_id UUID,
  public_reference TEXT,
  hold_expires_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hold_expires TIMESTAMPTZ;
  v_booking_id UUID;
BEGIN
  v_hold_expires := NOW() + (p_hold_duration_minutes || ' minutes')::INTERVAL;

  INSERT INTO public.bookings (
    venue_id,
    customer_name,
    customer_phone,
    customer_email,
    phone,
    email,
    players,
    booking_date,
    date_key,
    start_hour,
    end_hour,
    amount_paise,
    amount,
    currency,
    status,
    public_reference,
    reference,
    hold_expires_at,
    expires_at,
    created_at,
    updated_at
  )
  VALUES (
    p_venue_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_customer_phone,
    p_customer_email,
    p_players,
    p_booking_date,
    p_booking_date,
    p_start_hour,
    p_start_hour + 1,
    p_amount_paise,
    p_amount_paise,
    'INR',
    'HOLD'::booking_status,
    p_public_reference,
    p_public_reference,
    v_hold_expires,
    v_hold_expires,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_booking_id;

  RETURN QUERY
  SELECT v_booking_id, p_public_reference, v_hold_expires, 'HOLD'::TEXT;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE' USING ERRCODE = '23505';
END;
$$;

-- 7. Atomic PostgreSQL Function for Confirming Payment & Writing Notification Outbox Event
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_booking_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_payment_method TEXT,
  p_admin_phone TEXT DEFAULT '+919491501919'
)
RETURNS TABLE (
  booking_id UUID,
  public_reference TEXT,
  status TEXT,
  payment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ref TEXT;
  v_current_status booking_status;
BEGIN
  SELECT COALESCE(public_reference, reference), status INTO v_ref, v_current_status
  FROM public.bookings
  WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_current_status = 'CONFIRMED'::booking_status THEN
    RETURN QUERY SELECT p_booking_id, v_ref, 'CONFIRMED'::TEXT, 'CAPTURED'::TEXT;
    RETURN;
  END IF;

  UPDATE public.bookings
  SET
    status = 'CONFIRMED'::booking_status,
    razorpay_order_id = p_razorpay_order_id,
    payment_order_id = p_razorpay_order_id,
    razorpay_payment_id = p_razorpay_payment_id,
    payment_id = p_razorpay_payment_id,
    payment_method = p_payment_method,
    updated_at = NOW()
  WHERE id = p_booking_id;

  INSERT INTO public.booking_events (
    booking_id,
    event_type,
    metadata,
    created_at
  )
  VALUES (
    p_booking_id,
    'PAYMENT_CONFIRMED',
    jsonb_build_object(
      'razorpay_order_id', p_razorpay_order_id,
      'razorpay_payment_id', p_razorpay_payment_id,
      'payment_method', p_payment_method
    ),
    NOW()
  );

  INSERT INTO public.notification_outbox (
    event_type,
    booking_id,
    recipient,
    idempotency_key,
    status,
    created_at,
    updated_at
  )
  VALUES (
    'ADMIN_BOOKING_CONFIRMED',
    p_booking_id,
    p_admin_phone,
    'NOTIF_' || p_booking_id || '_CONFIRMED',
    'PENDING',
    NOW(),
    NOW()
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN QUERY SELECT p_booking_id, v_ref, 'CONFIRMED'::TEXT, 'CAPTURED'::TEXT;
END;
$$;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin_profiles"
  ON public.admin_profiles
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.admin_profiles));

CREATE POLICY "Admins can view notification outbox"
  ON public.notification_outbox
  FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.admin_profiles));

INSERT INTO public.admin_profiles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE phone LIKE '%9491501919%'
ON CONFLICT (user_id) DO NOTHING;
