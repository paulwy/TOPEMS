-- TOPEMS MES Service - Audit logs table (per spec §5)
-- 结构对齐 plugin_crm.audit_logs 以便统一查询

CREATE SCHEMA IF NOT EXISTS plugin_mes;

CREATE TABLE IF NOT EXISTS plugin_mes.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID,
    entity_ids JSONB,
    user_id VARCHAR(128),
    user_name VARCHAR(256),
    request_details JSONB,
    response_details JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'success',
    error_message TEXT,
    ip_address VARCHAR(64),
    user_agent TEXT,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_action ON plugin_mes.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_entity_type ON plugin_mes.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_tenant_id ON plugin_mes.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_created_at ON plugin_mes.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_user_id ON plugin_mes.audit_logs(user_id);

ALTER TABLE plugin_mes.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_mes.audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mes_audit_logs_tenant_isolation ON plugin_mes.audit_logs;
CREATE POLICY mes_audit_logs_tenant_isolation ON plugin_mes.audit_logs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
