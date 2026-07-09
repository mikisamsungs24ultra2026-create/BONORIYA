-- Add per-property FAQs to day_trip_properties.
-- Each row in the jsonb array is: { "question": string, "answer": string }
-- Empty array (default) means "no FAQ section" for that property on the booking page.
-- Bonoriya Agro Eco Tourism keeps its legacy hard-coded fallback FAQs in the UI
-- when this column is empty; other properties simply hide the FAQ section.

ALTER TABLE day_trip_properties
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN day_trip_properties.faqs IS
  'Per-property FAQ list — array of { question, answer } objects rendered at the bottom of the Day Trip booking page.';
