-- ============================================================
-- BONORIYA – Day Trip Properties (Multi-property support)
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- New table: day_trip_properties (replaces singleton bonoriya_property)
CREATE TABLE IF NOT EXISTS day_trip_properties (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL DEFAULT 'Bonoriya Agro Eco Tourism',
  tagline      text,
  location     text DEFAULT 'Jimbrigaon, Halher, Meghalaya',
  about_us     text,
  short_description text,
  hero_image   text,
  gallery      jsonb DEFAULT '[]',
  highlights   jsonb DEFAULT '[]',
  meal_options jsonb DEFAULT '[]',
  max_capacity_per_day integer DEFAULT 100,
  price_range  text DEFAULT '₹1,000–1,500',
  rating       text DEFAULT '4.8',
  contact_phone text,
  contact_email text,
  how_to_reach text,
  property_type text DEFAULT 'bonoriya_own',  -- 'bonoriya_own' | 'associated'
  active       boolean DEFAULT true,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE day_trip_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON day_trip_properties FOR ALL TO anon USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_day_trip_properties_active ON day_trip_properties(active);

-- Migrate existing bonoriya_property data into new table
INSERT INTO day_trip_properties (
  name, tagline, location, about_us, short_description,
  hero_image, gallery, highlights, meal_options,
  max_capacity_per_day, price_range, rating,
  contact_phone, contact_email, how_to_reach,
  property_type, active
)
SELECT
  COALESCE(name, 'Bonoriya Agro Eco Tourism'),
  tagline,
  COALESCE(location, 'Jimbrigaon, Halher, Meghalaya'),
  about_us,
  short_description,
  hero_image,
  COALESCE(gallery, '[]'),
  COALESCE(highlights, '[]'),
  COALESCE(meal_options, '[]'),
  COALESCE(max_capacity_per_day, 100),
  COALESCE(price_range, '₹1,000–1,500'),
  COALESCE(rating, '4.8'),
  contact_phone,
  contact_email,
  how_to_reach,
  'bonoriya_own',
  true
FROM bonoriya_property
WHERE NOT EXISTS (SELECT 1 FROM day_trip_properties LIMIT 1);

-- Verify
SELECT id, name, property_type, active FROM day_trip_properties ORDER BY created_at;
