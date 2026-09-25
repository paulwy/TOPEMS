CREATE TABLE IF NOT EXISTS iam.permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id UUID,
    before JSONB,
    after JSONB,
    reason TEXT,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_user_id ON iam.permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_target ON iam.permission_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_created_at ON iam.permission_audit_logs(created_at);