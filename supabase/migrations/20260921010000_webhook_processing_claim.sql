-- Make webhook replay protection explicit and reclaimable after a crashed worker.
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_webhook_events_processing
  ON public.webhook_events(razorpay_event_id, processed_at, processing_started_at);
