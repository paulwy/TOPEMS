-- V448: 业务工具权限控制数据库持久化
-- 创建租户权限表、工具权限表、权限审计日志表

-- 租户权限表
CREATE TABLE IF NOT EXISTS tenant_permissions (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    user_id         VARCHAR(64) NOT NULL,
    role            VARCHAR(32) NOT NULL DEFAULT 'member',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uk_tenant_user UNIQUE (tenant_id, user_id),
    CONSTRAINT chk_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tenant_permissions_tenant ON tenant_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_permissions_user ON tenant_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_permissions_role ON tenant_permissions(role);
CREATE INDEX IF NOT EXISTS idx_tenant_permissions_active ON tenant_permissions(active) WHERE deleted_at IS NULL;

-- 工具权限表
CREATE TABLE IF NOT EXISTS tool_permissions (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_permission_id BIGINT NOT NULL REFERENCES tenant_permissions(id) ON DELETE CASCADE,
    tool_name           VARCHAR(64) NOT NULL,
    max_permission      VARCHAR(16) NOT NULL DEFAULT 'read',
    allowed_operations  TEXT[],
    denied_operations   TEXT[],
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_tool UNIQUE (tenant_permission_id, tool_name),
    CONSTRAINT chk_max_permission CHECK (max_permission IN ('read', 'write', 'admin'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tool_permissions_tenant_permission ON tool_permissions(tenant_permission_id);
CREATE INDEX IF NOT EXISTS idx_tool_permissions_tool ON tool_permissions(tool_name);

-- 权限审计日志表
CREATE TABLE IF NOT EXISTS permission_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    user_id         VARCHAR(64) NOT NULL,
    action          VARCHAR(32) NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    changed_by      VARCHAR(64) NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address      INET,
    user_agent      TEXT,
    CONSTRAINT chk_action CHECK (action IN ('create', 'update', 'delete', 'activate', 'deactivate', 'role_change'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON permission_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON permission_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON permission_audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON permission_audit_logs(changed_by);

-- 更新 updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 触发器
DROP TRIGGER IF EXISTS update_tenant_permissions_updated_at ON tenant_permissions;
CREATE TRIGGER update_tenant_permissions_updated_at
    BEFORE UPDATE ON tenant_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tool_permissions_updated_at ON tool_permissions;
CREATE TRIGGER update_tool_permissions_updated_at
    BEFORE UPDATE ON tool_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
