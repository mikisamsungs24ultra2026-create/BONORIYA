-- ============================================================
-- BONORIYA Storage Buckets
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Create storage buckets for photos
insert into storage.buckets (id, name, public)
values
  ('property-photos', 'property-photos', true),
  ('room-photos',     'room-photos',     true),
  ('bonoriya-assets', 'bonoriya-assets', true)
on conflict (id) do nothing;

-- Allow public read on all three buckets
create policy "Public read property-photos"
  on storage.objects for select
  using (bucket_id = 'property-photos');

create policy "Anon upload property-photos"
  on storage.objects for insert
  with check (bucket_id = 'property-photos');

create policy "Anon update property-photos"
  on storage.objects for update
  using (bucket_id = 'property-photos');

create policy "Public read room-photos"
  on storage.objects for select
  using (bucket_id = 'room-photos');

create policy "Anon upload room-photos"
  on storage.objects for insert
  with check (bucket_id = 'room-photos');

create policy "Anon update room-photos"
  on storage.objects for update
  using (bucket_id = 'room-photos');

create policy "Public read bonoriya-assets"
  on storage.objects for select
  using (bucket_id = 'bonoriya-assets');

create policy "Anon upload bonoriya-assets"
  on storage.objects for insert
  with check (bucket_id = 'bonoriya-assets');

create policy "Anon update bonoriya-assets"
  on storage.objects for update
  using (bucket_id = 'bonoriya-assets');
