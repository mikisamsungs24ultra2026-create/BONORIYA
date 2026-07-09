-- ============================================================
-- BONORIYA — Discount Coupon System
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Coupons table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id                     text        PRIMARY KEY,
  name                   text        NOT NULL,
  code                   text        UNIQUE NOT NULL,
  description            text        DEFAULT '',
  booking_type           text        DEFAULT 'both'        CHECK (booking_type IN ('book-stays','day-trips','both')),
  property_type          text        DEFAULT 'both'        CHECK (property_type IN ('bonoriya_own','associated','both')),
  discount_type          text        DEFAULT 'percentage'  CHECK (discount_type IN ('percentage','fixed')),
  discount_value         numeric     DEFAULT 0             CHECK (discount_value >= 0),
  min_booking_amount     numeric     DEFAULT 0             CHECK (min_booking_amount >= 0),
  max_discount_amount    numeric     DEFAULT 0             CHECK (max_discount_amount >= 0),
  valid_from             date        NOT NULL,
  valid_until            date        NOT NULL,
  applicable_days        text        DEFAULT 'everyday'    CHECK (applicable_days IN ('everyday','weekends','weekdays')),
  max_usage_per_user     integer     DEFAULT 0             CHECK (max_usage_per_user >= 0),
  max_overall_redemptions integer    DEFAULT 0             CHECK (max_overall_redemptions >= 0),
  applicable_user_type   text        DEFAULT 'all'         CHECK (applicable_user_type IN ('new','existing','all')),
  visibility             text        DEFAULT 'public'      CHECK (visibility IN ('public','private','invite-only')),
  status                 text        DEFAULT 'active'      CHECK (status IN ('active','scheduled','expired','disabled')),
  redemption_count       integer     DEFAULT 0             CHECK (redemption_count >= 0),
  user_redemptions       jsonb       DEFAULT '{}'::jsonb,
  created_by             text        DEFAULT 'BONORIYA Admin',
  is_default             boolean     DEFAULT false,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (valid_until >= valid_from)
);

-- ── 2. Indexes for common query patterns ─────────────────────
CREATE INDEX IF NOT EXISTS idx_coupons_code         ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_status       ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_booking_type ON coupons(booking_type);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_until  ON coupons(valid_until);

-- ── 3. Auto-update updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_coupons_updated_at();

-- ── 4. Row Level Security ─────────────────────────────────────
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Public can read active public coupons (for booking pages)
DROP POLICY IF EXISTS "coupons_public_read"  ON coupons;
CREATE POLICY "coupons_public_read" ON coupons
  FOR SELECT TO anon
  USING (status = 'active' AND visibility = 'public');

-- Authenticated (admin) can do everything
DROP POLICY IF EXISTS "coupons_admin_all"    ON coupons;
CREATE POLICY "coupons_admin_all" ON coupons
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── 5. Seed the default NEWBONORIYA coupon ────────────────────
INSERT INTO coupons (
  id, name, code, description,
  booking_type, property_type, discount_type, discount_value,
  min_booking_amount, max_discount_amount,
  valid_from, valid_until, applicable_days,
  max_usage_per_user, max_overall_redemptions,
  applicable_user_type, visibility, status,
  redemption_count, user_redemptions,
  created_by, is_default
) VALUES (
  'default-newbonoriya',
  'New User Welcome Offer',
  'NEWBONORIYA',
  '10% off on your first 3 stays — exclusively for new Bonoriya members. Valid on all Bonoriya properties.',
  'book-stays', 'both', 'percentage', 10,
  0, 2000,
  '2024-01-01', '2026-12-31', 'everyday',
  3, 0,
  'new', 'public', 'active',
  0, '{}'::jsonb,
  'BONORIYA Admin', true
)
ON CONFLICT (id) DO NOTHING;

-- ── 6. Verify ────────────────────────────────────────────────
SELECT id, code, status, discount_value, booking_type FROM coupons ORDER BY created_at;
