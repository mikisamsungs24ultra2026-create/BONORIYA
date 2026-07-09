-- ============================================================
-- BONORIYA – Add commission/GST fields to bookings table
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS property_type       text DEFAULT 'bonoriya_own',
  ADD COLUMN IF NOT EXISTS commission_rate      numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_on_commission    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deduction      numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_payable          numeric DEFAULT 0;

-- Backfill for existing day-trip bookings with Bonoriya Own properties
UPDATE bookings
  SET property_type    = 'bonoriya_own',
      commission_rate  = 0,
      commission_amount = 0,
      gst_on_commission = 0,
      total_deduction   = 0,
      net_payable       = total_amount
  WHERE type = 'day-trip'
    AND (commission_amount IS NULL OR commission_amount = 0);

-- Verify
SELECT id, booking_ref, type, total_amount, property_type, commission_amount, net_payable
  FROM bookings WHERE type = 'day-trip' LIMIT 5;
