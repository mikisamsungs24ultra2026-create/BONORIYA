-- ============================================================
-- BONORIYA – Per-Property Day Trip Availability
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Step 1: Add property_id column (default 'default' for existing rows)
ALTER TABLE day_trip_availability
  ADD COLUMN IF NOT EXISTS property_id text DEFAULT 'default';

-- Step 2: Rename existing rows to 'default' property
UPDATE day_trip_availability SET property_id = 'default' WHERE property_id IS NULL;

-- Step 3: Drop the old single-column primary key
ALTER TABLE day_trip_availability DROP CONSTRAINT day_trip_availability_pkey;

-- Step 4: Add composite primary key (property_id, date)
ALTER TABLE day_trip_availability ADD PRIMARY KEY (property_id, date);

-- Step 5: Index for fast property lookups
CREATE INDEX IF NOT EXISTS idx_day_trip_avail_property
  ON day_trip_availability(property_id);

-- Verify
SELECT property_id, date, status FROM day_trip_availability ORDER BY property_id, date LIMIT 10;
