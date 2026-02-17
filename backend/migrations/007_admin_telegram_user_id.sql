-- Add telegram_user_id to admins table for direct telegram→admin lookup
ALTER TABLE admins ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_admins_telegram_user_id ON admins(telegram_user_id);
