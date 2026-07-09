-- ============================================================
-- BONORIYA Database Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Admin settings ──────────────────────────────────────────
create table if not exists admin_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb,
  updated_at timestamptz default now()
);

-- ── Partners ─────────────────────────────────────────────────
create table if not exists partners (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  name text not null,
  phone text,
  business_name text,
  gst_number text,
  address text,
  approved boolean default false,
  rejected boolean default false,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz default now()
);

-- ── Guests ───────────────────────────────────────────────────
create table if not exists guests (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  name text not null,
  phone text,
  address text,
  city text,
  state text,
  pin_code text,
  country text default 'India',
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- ── Partner property listings ─────────────────────────────────
create table if not exists partner_properties (
  id text primary key,
  partner_id text references partners(id) on delete cascade,
  partner_name text,
  partner_email text,
  name text not null,
  location text,
  description text,
  price text,
  price_per_night numeric default 0,
  type text default 'Associated',
  image text,
  rating text default '0',
  rooms integer default 0,
  max_guests integer default 2,
  amenities jsonb default '[]',
  active boolean default true,
  created_at timestamptz default now()
);

-- ── Full partner property dashboard data ─────────────────────
create table if not exists partner_property_data (
  partner_id text primary key references partners(id) on delete cascade,
  property_name text,
  property_type text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pin_code text,
  country text default 'India',
  lat numeric,
  lng numeric,
  map_address text,
  description text,
  amenities jsonb default '[]',
  check_in_time text default '14:00',
  check_out_time text default '11:00',
  cancellation_policy text default 'free-24h',
  pets_allowed boolean default false,
  smoking_allowed boolean default false,
  parties_allowed boolean default false,
  updated_at timestamptz default now()
);

-- ── Rooms ─────────────────────────────────────────────────────
create table if not exists rooms (
  id bigint primary key,
  partner_id text references partners(id) on delete cascade,
  type text not null,
  base_price numeric not null default 1500,
  available integer default 1,
  base_occupancy integer default 2,
  max_occupancy integer default 2,
  description text,
  created_at timestamptz default now()
);

-- ── Room photos ───────────────────────────────────────────────
create table if not exists room_photos (
  id text primary key,
  room_id bigint references rooms(id) on delete cascade,
  partner_id text references partners(id) on delete cascade,
  url text not null,
  file_name text,
  is_primary boolean default false,
  label text,
  sort_order integer default 0
);

-- ── Property photos (gallery) ─────────────────────────────────
create table if not exists property_photos (
  id text primary key,
  partner_id text references partners(id) on delete cascade,
  url text not null,
  file_name text,
  category text,
  is_main_image boolean default false,
  sort_order integer default 0
);

-- ── Room inventory / availability ─────────────────────────────
create table if not exists room_inventory (
  id uuid primary key default gen_random_uuid(),
  partner_id text references partners(id) on delete cascade,
  room_id bigint references rooms(id) on delete cascade,
  date date not null,
  available integer default 1,
  status text default 'available',
  unique(partner_id, room_id, date)
);

-- ── Bookings ──────────────────────────────────────────────────
create table if not exists bookings (
  id text primary key,
  booking_ref text unique not null,
  type text not null default 'hotel',
  partner_id text,
  partner_email text,
  property_id text,
  property_name text,
  property_location text,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  guest_address text,
  adults integer default 1,
  children integer default 0,
  check_in date,
  check_out date,
  nights integer,
  trip_date date,
  room_type text,
  room_id bigint,
  meal_option text,
  veg_count integer,
  non_veg_count integer,
  total_amount numeric default 0,
  advance_amount numeric default 0,
  payment_status text default 'Pending',
  booking_status text default 'Confirmed',
  booking_date date default current_date,
  no_show boolean default false,
  visitors jsonb default '[]',
  created_at timestamptz default now()
);

-- ── Day trip availability calendar ───────────────────────────
create table if not exists day_trip_availability (
  date date primary key,
  status text default 'available',
  max_capacity integer default 100
);

-- ── Bonoriya own property (Agro Eco Tourism) ─────────────────
create table if not exists bonoriya_property (
  id integer primary key default 1,
  name text default 'Bonoriya Agro Eco Tourism',
  tagline text,
  location text default 'Jimbrigaon, Halher, Meghalaya',
  about_us text,
  short_description text,
  hero_image text,
  gallery jsonb default '[]',
  highlights jsonb default '[]',
  meal_options jsonb default '[]',
  max_capacity_per_day integer default 100,
  price_range text default '₹1,000–1,500',
  rating text default '4.8',
  contact_phone text,
  contact_email text,
  how_to_reach text,
  updated_at timestamptz default now()
);

-- ── Email config ──────────────────────────────────────────────
create table if not exists email_config (
  id integer primary key default 1,
  service_id text,
  template_id text,
  public_key text,
  enabled boolean default false,
  updated_at timestamptz default now()
);

-- ── Analytics config ──────────────────────────────────────────
create table if not exists analytics_config (
  id integer primary key default 1,
  ga4_id text,
  gtm_id text,
  meta_pixel_id text,
  enabled boolean default false
);

-- ============================================================
-- Row Level Security — permissive (app handles auth logic)
-- ============================================================
alter table admin_settings enable row level security;
alter table partners enable row level security;
alter table guests enable row level security;
alter table partner_properties enable row level security;
alter table partner_property_data enable row level security;
alter table rooms enable row level security;
alter table room_photos enable row level security;
alter table property_photos enable row level security;
alter table room_inventory enable row level security;
alter table bookings enable row level security;
alter table day_trip_availability enable row level security;
alter table bonoriya_property enable row level security;
alter table email_config enable row level security;
alter table analytics_config enable row level security;

-- Allow anon key full access (application enforces its own auth)
create policy "public_all" on admin_settings      for all to anon using (true) with check (true);
create policy "public_all" on partners            for all to anon using (true) with check (true);
create policy "public_all" on guests              for all to anon using (true) with check (true);
create policy "public_all" on partner_properties  for all to anon using (true) with check (true);
create policy "public_all" on partner_property_data for all to anon using (true) with check (true);
create policy "public_all" on rooms               for all to anon using (true) with check (true);
create policy "public_all" on room_photos         for all to anon using (true) with check (true);
create policy "public_all" on property_photos     for all to anon using (true) with check (true);
create policy "public_all" on room_inventory      for all to anon using (true) with check (true);
create policy "public_all" on bookings            for all to anon using (true) with check (true);
create policy "public_all" on day_trip_availability for all to anon using (true) with check (true);
create policy "public_all" on bonoriya_property   for all to anon using (true) with check (true);
create policy "public_all" on email_config        for all to anon using (true) with check (true);
create policy "public_all" on analytics_config    for all to anon using (true) with check (true);

-- ============================================================
-- Useful indexes for query performance
-- ============================================================
create index if not exists idx_partner_properties_partner_id on partner_properties(partner_id);
create index if not exists idx_partner_properties_active on partner_properties(active);
create index if not exists idx_rooms_partner_id on rooms(partner_id);
create index if not exists idx_room_photos_room_id on room_photos(room_id);
create index if not exists idx_property_photos_partner_id on property_photos(partner_id);
create index if not exists idx_room_inventory_partner_date on room_inventory(partner_id, date);
create index if not exists idx_bookings_guest_email on bookings(guest_email);
create index if not exists idx_bookings_partner_id on bookings(partner_id);
create index if not exists idx_bookings_status on bookings(booking_status);
create index if not exists idx_bookings_type on bookings(type);
create index if not exists idx_partners_email on partners(email);
create index if not exists idx_guests_email on guests(email);
