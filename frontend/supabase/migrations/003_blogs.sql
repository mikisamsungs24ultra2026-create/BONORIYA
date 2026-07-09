-- ============================================================
-- BONORIYA Blogs Schema + Storage
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create table if not exists blogs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subtitle    text,
  content     text,
  excerpt     text,
  category    text default 'General',
  featured_image_url text,
  image_urls  jsonb default '[]',
  author_name text default 'BONORIYA Team',
  tags        jsonb default '[]',
  status      text default 'draft',   -- 'draft' | 'published' | 'scheduled'
  is_featured boolean default false,
  publish_date date,
  views       integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS
alter table blogs enable row level security;
create policy "public_all" on blogs for all to anon using (true) with check (true);

-- Index for public page query (only published / scheduled-now)
create index if not exists idx_blogs_status on blogs(status);
create index if not exists idx_blogs_publish_date on blogs(publish_date);
create index if not exists idx_blogs_created_at on blogs(created_at desc);

-- Blog images storage bucket
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

create policy "Public read blog-images"
  on storage.objects for select
  using (bucket_id = 'blog-images');

create policy "Anon upload blog-images"
  on storage.objects for insert
  with check (bucket_id = 'blog-images');

create policy "Anon update blog-images"
  on storage.objects for update
  using (bucket_id = 'blog-images');

create policy "Anon delete blog-images"
  on storage.objects for delete
  using (bucket_id = 'blog-images');
