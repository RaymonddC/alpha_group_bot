-- Alpha Groups Row Level Security (RLS) Policies
-- Created: 2026-02-16
--
-- NOTE: RLS policies use Supabase Auth functions (auth.uid())
-- They are intended for PRODUCTION (Supabase) only.
-- For LOCAL DEVELOPMENT with Docker PostgreSQL, RLS is DISABLED.
--
-- To enable RLS in production, run this on your Supabase instance manually.

-- ============================================================================
-- LOCAL DEVELOPMENT: Disable RLS so all queries work without Supabase Auth
-- ============================================================================
ALTER TABLE IF EXISTS groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS group_admins DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PRODUCTION RLS POLICIES (Supabase only)
-- ============================================================================
-- To enable in production, run the following on your Supabase SQL editor:
--
-- ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE group_admins ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Admins can view their groups" ON groups FOR SELECT
--   USING (id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.uid()));
--
-- CREATE POLICY "Admins can update their groups" ON groups FOR UPDATE
--   USING (id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.uid()));
--
-- CREATE POLICY "Admins can view members" ON members FOR SELECT
--   USING (group_id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.uid()));
--
-- CREATE POLICY "Admins can manage members" ON members FOR ALL
--   USING (group_id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.uid()));
--
-- CREATE POLICY "Public can insert verifications" ON verifications FOR INSERT
--   WITH CHECK (true);
--
-- CREATE POLICY "Admins can view verifications" ON verifications FOR SELECT
--   USING (telegram_id IN (
--     SELECT telegram_id FROM members
--     WHERE group_id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.uid())
--   ));
--
-- CREATE POLICY "System can insert activity logs" ON activity_log FOR INSERT
--   WITH CHECK (true);
--
-- CREATE POLICY "Admins can view activity" ON activity_log FOR SELECT
--   USING (member_id IN (
--     SELECT id FROM members
--     WHERE group_id IN (SELECT group_id FROM group_admins WHERE admin_id = auth.uid())
--   ));
--
-- CREATE POLICY "Admins can view their own profile" ON admins FOR SELECT
--   USING (id = auth.uid());
--
-- CREATE POLICY "Admins can view their memberships" ON group_admins FOR SELECT
--   USING (admin_id = auth.uid());
