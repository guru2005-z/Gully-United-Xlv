-- STAGE 1 — FULL HARDENING DATA LAYER MIGRATION

-- 1. Create Enums
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
  END IF;
END $$;

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 4. Create Security Definer has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  booking_date DATE NOT NULL,
  start_hour INT NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour INT NOT NULL CHECK (end_hour >= 1 AND end_hour <= 24),
  players INT NOT NULL DEFAULT 12,
  amount_paise INT NOT NULL,
  amount NUMERIC(10, 2) GENERATED ALWAYS AS (amount_paise / 100.0) STORED,
  status public.booking_status NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  hold_expires_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Hard Rule: Unique constraint preventing two active bookings for the same date + hour
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_bookings_unique_slot 
ON public.bookings (booking_date, start_hour) 
WHERE status IN ('pending', 'confirmed', 'completed');

-- 6. Create blocked_slots table
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  hour INT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  reason TEXT NOT NULL DEFAULT 'Maintenance / Tournament',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, hour)
);

-- 7. Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before_after JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Create app_errors table
CREATE TABLE IF NOT EXISTS public.app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack TEXT,
  route TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Settings
INSERT INTO public.settings (key, value)
VALUES
  ('pricing', '{"dayRatePaise": 29900, "nightRatePaise": 49900, "nightFromHour": 17, "currency": "INR"}'::jsonb),
  ('operating_hours', '{"openHour": 6, "closeHour": 23, "slotLengthHours": 1}'::jsonb),
  ('venue_limits', '{"maxPlayers": 16, "cancellationWindowHours": 12, "advanceBookingDays": 7}'::jsonb),
  ('maintenance_mode', '{"enabled": false, "message": "Turf undergoing scheduled maintenance."}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- 11. Enable Row-Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies

-- Profiles Policies
CREATE POLICY "Users view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User Roles Policies
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Bookings Policies
CREATE POLICY "Users read own bookings or public slot checks" ON public.bookings
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR true);

CREATE POLICY "Users create bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins or owners update bookings" ON public.bookings
  FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Blocked Slots Policies
CREATE POLICY "Public read blocked slots" ON public.blocked_slots
  FOR SELECT USING (true);

CREATE POLICY "Admins manage blocked slots" ON public.blocked_slots
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Contact Messages Policies
CREATE POLICY "Anyone submit contact messages" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins read and manage contact messages" ON public.contact_messages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit Log Policies
CREATE POLICY "Admins view audit logs" ON public.audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- App Errors Policies
CREATE POLICY "Anyone insert app errors" ON public.app_errors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins view app errors" ON public.app_errors
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Settings Policies
CREATE POLICY "Public read settings" ON public.settings
  FOR SELECT USING (true);

CREATE POLICY "Admins update settings" ON public.settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 13. Grant Permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.bookings, public.contact_messages, public.app_errors TO anon, authenticated;
