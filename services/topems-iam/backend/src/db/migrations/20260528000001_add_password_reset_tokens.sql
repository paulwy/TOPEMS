CREATE TABLE IF NOT EXISTS iam.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON iam.password_reset_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON iam.password_reset_tokens(token);
