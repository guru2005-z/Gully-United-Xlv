begin;

select plan(6);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.bookings'::regclass),
  'bookings has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.payments'::regclass),
  'payments has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.webhook_events'::regclass),
  'webhook_events has RLS enabled'
);

select ok(
  has_function_privilege('anon', 'public.create_booking_hold(uuid,text,text,text,integer,date,integer,integer,text,integer)', 'EXECUTE') = false,
  'anon cannot execute the booking hold function'
);

select ok(
  has_function_privilege('authenticated', 'public.create_booking_hold(uuid,text,text,text,integer,date,integer,integer,text,integer)', 'EXECUTE') = false,
  'authenticated cannot execute the booking hold function directly'
);

select ok(
  has_function_privilege('service_role', 'public.create_booking_hold(uuid,text,text,text,integer,date,integer,integer,text,integer)', 'EXECUTE'),
  'service_role can execute the booking hold function'
);

select * from finish();
rollback;
