CREATE TABLE IF NOT EXISTS admin_registration_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(64) UNIQUE NOT NULL,
    telegram_user_id BIGINT NOT NULL,
    telegram_username VARCHAR(255),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_tokens_token ON admin_registration_tokens(token);
