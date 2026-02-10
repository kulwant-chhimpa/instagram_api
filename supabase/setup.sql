-- ============================================================================
-- Supabase SQL Setup
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1. Create the cache table
CREATE TABLE IF NOT EXISTS instagram_cache (
  username   TEXT PRIMARY KEY,
  profile_pic TEXT NOT NULL,
  followers  BIGINT NOT NULL DEFAULT 0,
  following  BIGINT NOT NULL DEFAULT 0,
  cached_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index for fast lookups (primary key already covers this, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_instagram_cache_cached_at
  ON instagram_cache (cached_at);

-- 3. Create the storage bucket (run via Supabase Dashboard or API)
--    Dashboard → Storage → New Bucket
--    Name: instagram-profiles
--    Public: ON

-- 4. Storage policy: allow public reads (if not using the dashboard toggle)
--    This is only needed if you created the bucket via SQL.
--    If you toggled "Public" in the dashboard, skip this.

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('instagram-profiles', 'instagram-profiles', true)
-- ON CONFLICT (id) DO NOTHING;
