-- Alpha Groups Seed Data Migration
-- Created: 2026-02-16
-- This migration creates seed data for local development

-- NOTE: Do NOT run this in production!
-- This seed data is for development/testing only

-- ============================================================================
-- SEED ADMIN USER
-- ============================================================================
-- Default admin for testing dashboard
-- Email: admin@alphagroups.xyz
-- Password: admin123 (hashed with bcrypt, cost 10)
-- Hash generated: $2b$10$B3lHUfWLWf9a6jL1y9z7aO0L5b3c8d9e0f1g2h3i4j5k6l7m8n9o0

INSERT INTO admins (email, password_hash, name)
VALUES (
  'admin@alphagroups.xyz',
  '$2a$10$OSoqcHMfRhPLbStEjEdeDO8aM.3DAIzO1kXp/tc/pN8xBXvlamOI2',
  'Default Admin'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DEFAULT GROUP
-- ============================================================================
-- A test group for development and testing
-- Telegram Group ID: -1001234567890 (you'll need to update this)
-- Thresholds: Bronze 300, Silver 500, Gold 700

INSERT INTO groups (
  telegram_group_id,
  name,
  bronze_threshold,
  silver_threshold,
  gold_threshold,
  auto_kick_enabled,
  recheck_frequency
)
VALUES (
  -1001234567890,
  'Alpha Groups Test Community',
  300,
  500,
  700,
  true,
  'daily'
)
ON CONFLICT (telegram_group_id) DO NOTHING;

-- ============================================================================
-- LINK ADMIN TO GROUP
-- ============================================================================
-- Give the default admin access to the default group
-- This query needs to run after both admins and groups are created

INSERT INTO group_admins (group_id, admin_id, role)
SELECT
  g.id,
  a.id,
  'admin'
FROM groups g, admins a
WHERE g.telegram_group_id = -1001234567890
  AND a.email = 'admin@alphagroups.xyz'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INSTRUCTIONS FOR UPDATING SEED DATA
-- ============================================================================
-- 1. Update the telegram_group_id above to match your actual test group ID
--    Get this from: https://www.showhiddencc.com/find-facebook-group-id/
--    For Telegram groups, the ID format is negative: -1001234567890
--
-- 2. If you want to change the default admin credentials:
--    - Update the email and password_hash values
--    - Generate new password hash using:
--      npm install -g bcryptjs
--      node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
--
-- 3. To add more test data, follow the same pattern:
--    INSERT INTO table_name (...) VALUES (...) ON CONFLICT DO NOTHING;
