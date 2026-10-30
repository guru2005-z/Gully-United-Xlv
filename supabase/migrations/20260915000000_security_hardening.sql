-- Security hardening for booking privacy and server-only hold creation.

DROP POLICY IF EXISTS "Users read own bookings or public slot checks" ON public.bookings;
CREATE POLICY "Users read own bookings or admins" ON public.bookings
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

REVOKE SELECT ON public.bookings FROM anon, authenticated;
GRANT SELECT ON public.bookings TO authenticated;

ALTER FUNCTION public.create_booking_hold(
  UUID, TEXT, TEXT, TEXT, INT, DATE, INT, INT, TEXT, INT
) SET search_path = public;

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
SET search_path = public
AS $$
DECLARE
  v_hold_expires TIMESTAMPTZ;
  v_booking_id UUID;
BEGIN
  IF p_players < 1 OR p_players > 16 THEN
    RAISE EXCEPTION 'INVALID_PLAYERS';
  END IF;
  IF p_start_hour < 6 OR p_start_hour > 22 THEN
    RAISE EXCEPTION 'INVALID_START_HOUR';
  END IF;
  IF p_amount_paise < 0 OR p_hold_duration_minutes NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'INVALID_HOLD';
  END IF;

  v_hold_expires := NOW() + (p_hold_duration_minutes || ' minutes')::INTERVAL;

  UPDATE public.bookings
  SET status = 'EXPIRED'::booking_status,
      updated_at = NOW()
  WHERE venue_id = p_venue_id
    AND booking_date = p_booking_date
    AND start_hour = p_start_hour
    AND status = 'HOLD'::booking_status
    AND (
      (hold_expires_at IS NOT NULL AND hold_expires_at <= NOW())
      OR (expires_at IS NOT NULL AND expires_at <= NOW())
    );

  INSERT INTO public.bookings (
    venue_id, customer_name, customer_phone, customer_email, phone, email,
    players, booking_date, date_key, start_hour, end_hour, amount_paise, amount,
    currency, status, public_reference, reference, hold_expires_at, expires_at,
    created_at, updated_at
  )
  VALUES (
    p_venue_id, p_customer_name, p_customer_phone, p_customer_email,
    p_customer_phone, p_customer_email, p_players, p_booking_date, p_booking_date,
    p_start_hour, p_start_hour + 1, p_amount_paise, p_amount_paise / 100.0,
    'INR', 'HOLD'::booking_status, p_public_reference, p_public_reference,
    v_hold_expires, v_hold_expires, NOW(), NOW()
  )
  RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT v_booking_id, p_public_reference, v_hold_expires, 'HOLD'::TEXT;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE' USING ERRCODE = '23505';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_booking_hold(
  UUID, TEXT, TEXT, TEXT, INT, DATE, INT, INT, TEXT, INT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_hold(
  UUID, TEXT, TEXT, TEXT, INT, DATE, INT, INT, TEXT, INT
) TO service_role;
