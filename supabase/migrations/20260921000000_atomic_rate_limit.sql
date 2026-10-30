-- Serialize rate-limit consumption per key so concurrent auth requests cannot bypass limits.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INT,
  retry_after_seconds INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_expires_at TIMESTAMPTZ := v_now + make_interval(secs => p_window_seconds);
  v_event public.rate_limit_events%ROWTYPE;
  v_retry_after INT;
BEGIN
  IF p_key IS NULL OR p_key = '' OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'INVALID_RATE_LIMIT_ARGUMENTS';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_key, 0));
  DELETE FROM public.rate_limit_events
  WHERE key = p_key AND expires_at <= v_now;

  SELECT * INTO v_event
  FROM public.rate_limit_events
  WHERE key = p_key AND expires_at > v_now
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limit_events (key, count, expires_at)
    VALUES (p_key, 1, v_expires_at);
    RETURN QUERY SELECT TRUE, p_limit - 1, 0;
    RETURN;
  END IF;

  v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_event.expires_at - v_now)))::INT);
  IF v_event.count >= p_limit THEN
    RETURN QUERY SELECT FALSE, 0, v_retry_after;
    RETURN;
  END IF;

  UPDATE public.rate_limit_events
  SET count = v_event.count + 1
  WHERE id = v_event.id;

  RETURN QUERY SELECT TRUE, p_limit - v_event.count - 1, 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INT, INT) TO service_role;
