-- Alpha Groups Nonce Cleanup Migration
-- Created: 2026-02-16
-- This migration sets up automatic cleanup of old nonces

-- ============================================================================
-- NONCE CLEANUP FUNCTION
-- ============================================================================
-- Deletes nonces older than 1 hour
-- Prevents the used_nonces table from growing unbounded
-- Nonces expire after 1 hour since they're tied to SIWS timestamp validation
CREATE OR REPLACE FUNCTION cleanup_old_nonces()
RETURNS void AS $$
BEGIN
  DELETE FROM used_nonces
  WHERE used_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- OPTIONAL: pg_cron SETUP FOR AUTOMATIC CLEANUP
-- ============================================================================
-- Uncomment the lines below if pg_cron is installed on your Supabase instance
-- This runs the cleanup function every hour automatically

-- Create extension if not exists
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every hour
-- SELECT cron.schedule(
--   'cleanup-old-nonces',
--   '0 * * * *',  -- Every hour at :00 minutes
--   'SELECT cleanup_old_nonces()'
-- );

-- ============================================================================
-- MANUAL CLEANUP INSTRUCTION
-- ============================================================================
-- If pg_cron is not available, you can call cleanup manually:
-- SELECT cleanup_old_nonces();
--
-- Or set up a backend cron job to call this daily:
-- POST /api/cron/cleanup-nonces (with CRON_SECRET auth)
