-- Migration 008: Add admin audit columns to activity_log
-- Adds group_id, admin_id, and action_source for audit trail

ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES admins(id) ON DELETE SET NULL;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS action_source VARCHAR(20) DEFAULT 'system';
CREATE INDEX IF NOT EXISTS idx_activity_log_group_id ON activity_log(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_admin_id ON activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
