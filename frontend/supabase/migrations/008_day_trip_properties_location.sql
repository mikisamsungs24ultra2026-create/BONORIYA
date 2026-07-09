-- ============================================================
-- BONORIYA – Add lat/lng/map_address to day_trip_properties
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE day_trip_properties
  ADD COLUMN IF NOT EXISTS lat          numeric DEFAULT 25.5788,
  ADD COLUMN IF NOT EXISTS lng          numeric DEFAULT 91.8933,
  ADD COLUMN IF NOT EXISTS map_address  text;

-- Default coords: Jimbrigaon, Halher, Meghalaya area
UPDATE day_trip_properties
  SET lat = 25.5788, lng = 91.8933
  WHERE lat IS NULL OR lat = 0;

-- Verify
SELECT id, name, lat, lng, map_address FROM day_trip_properties;
