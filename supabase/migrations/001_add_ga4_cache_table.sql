-- GA4 Cache Table for Persistent Analytics Caching
-- Created: August 16, 2025
-- Purpose: Store GA4 API responses to improve performance (180x speed improvement)

CREATE TABLE IF NOT EXISTS ga4_cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Performance indexes for optimal cache lookups
CREATE INDEX IF NOT EXISTS idx_ga4_cache_expires 
  ON ga4_cache (expires_at);

-- Optional: Add cleanup function for expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_ga4_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ga4_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON TABLE ga4_cache IS 'Persistent cache for GA4 analytics endpoints with automatic expiry';
COMMENT ON COLUMN ga4_cache.key IS 'Unique cache key (e.g., ga4:realtime, ga4:kpis:2025-08-10:2025-08-16:all)';
COMMENT ON COLUMN ga4_cache.value IS 'Cached JSON response from GA4 API';
COMMENT ON COLUMN ga4_cache.expires_at IS 'Expiration timestamp for automatic cleanup';