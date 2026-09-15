-- 20260914000000_super_admin_suite.sql
-- Super Admin Suite Schema Migration for Gully United XLV

-- 1. Extend admin roles in admin_profiles
ALTER TABLE IF EXISTS public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_role_check;

ALTER TABLE IF EXISTS public.admin_profiles
  ADD CONSTRAINT admin_profiles_role_check
  CHECK (role IN ('super_admin', 'manager', 'finance_admin', 'content_admin', 'support_admin', 'admin', 'staff'));

-- 2. Website Settings & Configuration Table
CREATE TABLE IF NOT EXISTS public.website_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default website settings
INSERT INTO public.website_settings (key, value)
VALUES
  ('hero', '{"heading": "SC Boys Ground, Kota", "subheading": "Premium Night Cricket & Sports Venue", "ctaText": "Book Your Slot Now", "ctaLink": "/book", "badge": "SC Boys Residential School Road, Kota"}'::jsonb),
  ('about', '{"description": "Gully United XLV is Kota premier cricket turf featuring professional turf, high-intensity LED floodlights, player dugout, and 16-player max capacity slots.", "turfType": "Professional Artificial Turf", "dimensions": "100ft x 50ft", "capacity": 16, "facilities": ["Flood Lights", "Free Parking", "Drinking Water", "Dugout Seating", "Washrooms", "Cricket Equipment"]}'::jsonb),
  ('contact', '{"phone": "+919390817811", "whatsapp": "+919390817811", "email": "Gullyunitedxlv@gmail.com", "address": "SC Boys Residential School Road, Kota, Rajasthan 324005", "googleMaps": "https://maps.google.com"}'::jsonb),
  ('operating_hours', '{"openHour": 6, "closeHour": 23, "slotDurationHours": 1, "dayRate": 299, "nightRate": 499, "nightFrom": 17}'::jsonb),
  ('maintenance_mode', '{"enabled": false, "message": "Gully United XLV turf is currently undergoing scheduled maintenance. Please check back shortly."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Site Announcements / Floating Banners Table
CREATE TABLE IF NOT EXISTS public.site_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'OFFER' CHECK (type IN ('OFFER', 'ALERT', 'INFO', 'MAINTENANCE')),
  link_url TEXT,
  image_url TEXT,
  cta_text TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Gallery Media Table
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE', 'VIDEO')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'TURF' CHECK (category IN ('TURF', 'NIGHT_LIGHTS', 'MATCHES', 'FACILITIES')),
  caption TEXT,
  alt_text TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Customer Feedback & Review Table
CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category TEXT NOT NULL DEFAULT 'TURF_QUALITY' CHECK (category IN ('TURF_QUALITY', 'LIGHTING', 'BOOKING_EXPERIENCE', 'PRICING', 'OVERALL')),
  comment TEXT NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Discount Coupons Engine Table
CREATE TABLE IF NOT EXISTS public.discount_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE' CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value INT NOT NULL CHECK (discount_value > 0),
  min_booking_amount INT NOT NULL DEFAULT 0,
  max_discount_paise INT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  usage_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Slot & Special Pricing Rules Table
CREATE TABLE IF NOT EXISTS public.slot_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('WEEKDAY', 'WEEKEND', 'HOLIDAY', 'SPECIAL_EVENT')),
  day_rate_paise INT NOT NULL,
  night_rate_paise INT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Cancellation & Refund Policy Configuration Table
CREATE TABLE IF NOT EXISTS public.cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hours_before_slot INT NOT NULL,
  refund_percentage INT NOT NULL CHECK (refund_percentage BETWEEN 0 AND 100),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.cancellation_policies (name, hours_before_slot, refund_percentage, description)
VALUES
  ('Full Refund (>24h)', 24, 100, '100% refund if cancelled more than 24 hours in advance'),
  ('Partial Refund (12h-24h)', 12, 50, '50% refund if cancelled between 12 and 24 hours before slot'),
  ('No Refund (<12h)', 0, 0, 'No refund if cancelled less than 12 hours before slot')
ON CONFLICT DO NOTHING;

-- 9. Refund Requests & Transactions Table
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount_paise INT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'FAILED')),
  gateway_refund_id TEXT,
  requested_by UUID REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. System Audit Log Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Admin System Notifications Table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('NEW_BOOKING', 'PAYMENT_FAILED', 'REFUND_REQUEST', 'CANCELLATION', 'SYSTEM_ALERT')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Enable Row Level Security (RLS) on all admin tables
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- 13. Public Read Policies for Website Content
CREATE POLICY "Public read website_settings" ON public.website_settings FOR SELECT USING (true);
CREATE POLICY "Public read site_announcements" ON public.site_announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Public read gallery_items" ON public.gallery_items FOR SELECT USING (is_published = true);
CREATE POLICY "Public read customer_feedback" ON public.customer_feedback FOR SELECT USING (is_published = true);

-- Helper Admin Check Function
CREATE OR REPLACE FUNCTION public.is_super_admin_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Admin All-Access Policies
CREATE POLICY "Admins full website_settings" ON public.website_settings FOR ALL USING (public.is_super_admin_or_admin());
CREATE POLICY "Admins full site_announcements" ON public.site_announcements FOR ALL USING (public.is_super_admin_or_admin());
CREATE POLICY "Admins full gallery_items" ON public.gallery_items FOR ALL USING (public.is_super_admin_or_admin());
CREATE POLICY "Admins full customer_feedback" ON public.customer_feedback FOR ALL USING (public.is_super_admin_or_admin());
CREATE POLICY "Admins full discount_coupons" ON public.discount_coupons FOR ALL USING (public.is_super_admin_or_admin());
CREATE POLICY "Admins full slot_pricing_rules" ON public.slot_pricing_rules FOR ALL USING (public.is_super_admin_or_admin());
CREATE POLICY "Admins full cancellation_policies" ON public.cancellation_policies FOR ALL USING (public.is_super_admin_or_admin());
CREATE POLICY "Admins full refund_requests" ON public.refund_requests FOR ALL USING (public.is_super_admin_or_admin());
CREATE POLICY "Admins full admin_audit_logs" ON public.admin_audit_logs FOR ALL USING (public.is_super_admin_or_admin());
CREATE POLICY "Admins full admin_notifications" ON public.admin_notifications FOR ALL USING (public.is_super_admin_or_admin());

-- Customers can submit feedback
CREATE POLICY "Authenticated users submit feedback" ON public.customer_feedback FOR INSERT WITH CHECK (true);
