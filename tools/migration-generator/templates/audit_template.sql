-- =============================================================
-- TOPEMS {{service_name}} 审计日志表模板
-- 迁移版本: {{version}}
-- 生成时间: {{timestamp}}
-- =============================================================

CREATE SCHEMA IF NOT EXISTS {{schema}};

SET search_path TO {{schema}}, public;

-- =============================================================
-- 审计日志主表
-- =============================================================
CREATE TABLE IF NOT EXISTS {{schema}}.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    actor_id VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255),
    actor_role VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    request_params JSONB,
    old_values JSONB,
    new_values JSONB,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    duration_ms INTEGER,
    correlation_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_service_name ON {{schema}}.audit_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON {{schema}}.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON {{schema}}.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON {{schema}}.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON {{schema}}.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON {{schema}}.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON {{schema}}.audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON {{schema}}.audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_service_created ON {{schema}}.audit_logs(service_name, created_at DESC);

-- =============================================================
-- 审计事件类型字典表
-- =============================================================
CREATE TABLE IF NOT EXISTS {{schema}}.audit_event_types (
    id SERIAL PRIMARY KEY,
    event_code VARCHAR(50) NOT NULL UNIQUE,
    event_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    severity VARCHAR(20) DEFAULT 'info',
    enabled BOOLEAN DEFAULT TRUE,
    retention_days INTEGER DEFAULT 365,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_event_types_code ON {{schema}}.audit_event_types(event_code);
CREATE INDEX IF NOT EXISTS idx_audit_event_types_category ON {{schema}}.audit_event_types(category);

-- =============================================================
-- 触发器：自动更新 updated_at
-- =============================================================
CREATE OR REPLACE FUNCTION {{schema}}.update_audit_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_audit_event_types_updated_at ON {{schema}}.audit_event_types;
CREATE TRIGGER update_audit_event_types_updated_at
    BEFORE UPDATE ON {{schema}}.audit_event_types
    FOR EACH ROW
    EXECUTE FUNCTION {{schema}}.update_audit_updated_at_column();

-- =============================================================
-- 迁移结束
-- =============================================================
