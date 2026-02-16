-- Alpha Groups Indexes Migration
-- Created: 2026-02-16
-- This migration adds indexes for optimal query performance

-- CRITICAL: Indexes on columns used in RLS policies provide 100x+ performance gains
-- All queries listed here are from actual usage patterns

-- ============================================================================
-- GROUPS INDEXES
-- ============================================================================
-- Used when looking up group by telegram ID
CREATE INDEX IF NOT EXISTS idx_groups_telegram_id ON groups(telegram_group_id);

-- ============================================================================
-- MEMBERS INDEXES (CRITICAL - Most frequently queried table)
-- ============================================================================
-- Used in all member queries
CREATE INDEX IF NOT EXISTS idx_members_group_id ON members(group_id);

-- Used for wallet lookups (verify endpoint, re-check)
CREATE INDEX IF NOT EXISTS idx_members_wallet ON members(wallet_address);

-- Used for telegram ID lookups (status command, notifications)
CREATE INDEX IF NOT EXISTS idx_members_telegram_id ON members(telegram_id);

-- Used for tier-based filtering (analytics, member list)
CREATE INDEX IF NOT EXISTS idx_members_tier ON members(tier);

-- Used for RLS policies checking admin access
CREATE INDEX IF NOT EXISTS idx_members_last_checked ON members(last_checked);

-- Composite index for common query: all members of a group with specific tier
CREATE INDEX IF NOT EXISTS idx_members_group_tier ON members(group_id, tier);

-- ============================================================================
-- VERIFICATIONS INDEXES
-- ============================================================================
-- Used for audit log lookups
CREATE INDEX IF NOT EXISTS idx_verifications_telegram_id ON verifications(telegram_id);

-- Used to prevent duplicate verifications from same wallet
CREATE INDEX IF NOT EXISTS idx_verifications_wallet ON verifications(wallet_address);

-- Used for nonce uniqueness checking (replay protection)
CREATE INDEX IF NOT EXISTS idx_verifications_nonce ON verifications(nonce);

-- Used for sorting audit logs by date (DESC for newest first)
CREATE INDEX IF NOT EXISTS idx_verifications_verified_at ON verifications(verified_at DESC);

-- ============================================================================
-- ADMINS INDEXES
-- ============================================================================
-- Used for admin login by email
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- ============================================================================
-- GROUP_ADMINS INDEXES
-- ============================================================================
-- Used to find all groups for an admin (dashboard navigation)
CREATE INDEX IF NOT EXISTS idx_group_admins_admin_id ON group_admins(admin_id);

-- Used to find all admins for a group (permission checking)
CREATE INDEX IF NOT EXISTS idx_group_admins_group_id ON group_admins(group_id);

-- ============================================================================
-- ACTIVITY_LOG INDEXES
-- ============================================================================
-- Used to find activities for a member
CREATE INDEX IF NOT EXISTS idx_activity_member_id ON activity_log(member_id);

-- Used for sorting activities by date (DESC for newest first)
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at DESC);

-- Used to count actions by type (analytics)
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);

-- ============================================================================
-- USED_NONCES INDEXES
-- ============================================================================
-- Used for nonce cleanup (delete old nonces)
CREATE INDEX IF NOT EXISTS idx_used_nonces_used_at ON used_nonces(used_at);
