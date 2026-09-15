create extension if not exists pgcrypto;

create type public.user_role as enum ('CUSTOMER', 'ADMIN');
create type public.booking_status as enum ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'BLOCKED');
create type public.payment_status as enum ('UNPAID', 'PAID', 'REFUNDED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'CUSTOMER',
  created_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  phone text not null,
  email text not null,
  open_hour smallint not null default 6 check (open_hour between 0 and 23),
  close_hour smallint not null default 23 check (close_hour between 1 and 24),
  max_players smallint not null default 16 check (max_players > 0),
  day_rate integer not null default 299 check (day_rate >= 0),
  night_rate integer not null default 499 check (night_rate >= 0),
  night_from smallint not null default 17 check (night_from between 0 and 23),
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id),
  customer_id uuid references auth.users(id),
  reference text not null unique,
  customer_name text not null,
  phone text not null,
  email text not null,
  players smallint not null check (players between 1 and 16),
  date_key date not null,
  start_hour smallint not null check (start_hour between 6 and 22),
  amount integer not null check (amount >= 0),
  status public.booking_status not null default 'PENDING',
  payment_status public.payment_status not null default 'UNPAID',
  payment_provider text,
  payment_order_id text,
  payment_id text,
  payment_method text,
  notes text,
  idempotency_key text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, idempotency_key)
);

create unique index bookings_active_slot_idx on public.bookings (venue_id, date_key, start_hour)
where status in ('PENDING', 'CONFIRMED', 'BLOCKED');
create index bookings_date_idx on public.bookings (venue_id, date_key);

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  provider text not null,
  event_key text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;

create policy "public can read venue" on public.venues for select using (true);
create policy "customers read own bookings" on public.bookings for select using (auth.uid() = customer_id);
create policy "admins read bookings" on public.bookings for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'));
create policy "admins manage bookings" on public.bookings for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'));

insert into public.venues (name, address, phone, email)
values ('Gully United XLV', 'SC Boys Residential School Road, Kota', '9390817811', 'Gullyunitedxlv@gmail.com');
