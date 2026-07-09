-- ============================================================
-- BONORIYA – Admin Account Security Migration
-- Run this in Supabase Dashboard → SQL Editor → New Query
--
-- Purpose:
--   1. Store admin credentials securely in admin_settings
--      (no more hardcoded passwords in source code)
--   2. Password is stored as SHA-256 hash, never plaintext
--   3. Frontend validates via Supabase, not localStorage
-- ============================================================

-- The admin_settings table already exists from migration 001.
-- This migration inserts the initial admin account record.

-- ── Step 1: Generate SHA-256 of your admin password ──────────────────────────
-- In a terminal, run:
--   echo -n "YourNewPassword123!" | sha256sum
-- Copy the hash (without the trailing " -") and paste below.
--
-- OR use this JavaScript one-liner in browser console:
--   crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourPassword'))
--     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
-- ─────────────────────────────────────────────────────────────────────────────

-- !! IMPORTANT: Replace PASTE_SHA256_HASH_HERE with your actual password hash !!
-- Example: if your password is "Bonoriya@2026", its SHA-256 is:
--   Replace the string below with: sha256('Bonoriya@2026')
--   (compute it yourself — never share the actual hash here)

INSERT INTO admin_settings (key, value, updated_at)
VALUES (
  'admin_account',
  jsonb_build_object(
    'userId',       'admin@bonoriya.com',
    'email',        'admin@bonoriya.com',
    'name',         'BONORIYA Admin',
    'passwordHash', 'PASTE_SHA256_HASH_HERE'
  ),
  now()
)
ON CONFLICT (key) DO UPDATE
  SET value      = EXCLUDED.value,
      updated_at = now();

-- ── Step 2: Remove old plaintext admin record if present ─────────────────────
-- (The old code stored DEFAULT_ADMIN in localStorage. Nothing to clean in DB,
--  but this comment documents the migration intent.)

-- ── Step 3: Verify the record was inserted ───────────────────────────────────
SELECT key, value->>'userId' AS admin_email, updated_at
FROM admin_settings
WHERE key = 'admin_account';

-- ── How to change admin password later ───────────────────────────────────────
-- Use the Admin Panel → Settings → Reset Password flow.
-- It will re-hash and update this record automatically via the frontend.
-- OR run SQL:
--   UPDATE admin_settings
--   SET value = jsonb_set(value, '{passwordHash}', '"NEW_SHA256_HASH"'),
--       updated_at = now()
--   WHERE key = 'admin_account';
