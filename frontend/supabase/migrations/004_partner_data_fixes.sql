-- ============================================================
-- BONORIYA – Partner Data Schema Fixes
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add missing JSONB columns to partner_property_data
alter table partner_property_data
  add column if not exists rooms   jsonb default '[]',
  add column if not exists images  jsonb default '[]';

-- Auto-deduct inventory on confirmed booking
-- Auto-restore inventory on cancellation
-- Implemented via application logic (see auth.ts updateBookingStatus)

-- Ensure partner_property_data allows full upsert
-- (columns already have RLS policy from migration 001)
