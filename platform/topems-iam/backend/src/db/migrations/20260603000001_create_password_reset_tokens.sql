-- 创建密码重置令牌表
CREATE TABLE IF NOT EXISTS iam.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON iam.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON iam.password_reset_tokens(token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_user_unique ON iam.password_reset_tokens(user_id);