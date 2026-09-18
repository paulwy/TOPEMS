CREATE TABLE IF NOT EXISTS core_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    username VARCHAR(64) NOT NULL,
    ip_address VARCHAR(128) NOT NULL,
    user_agent TEXT,
    status VARCHAR(32) NOT NULL,
    error_message TEXT,
    login_time TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_tenant_id ON core_login_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON core_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON core_login_logs(login_time);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON core_login_logs(status);