-- V448: 业务工具权限控制数据库持久化
-- 创建租户权限表、工具权限表、权限审计日志表
--
-- 2026-09-18 防御化修补（空库重建链卡点）：
--   空库重建时早期迁移先创建了仅含 id/deleted_at 的裸骨架表，
--   原脚本 CREATE TABLE IF NOT EXISTS 静默跳过后再 CREATE INDEX 即报
--   "column ... does not exist"，导致迁移链卡死在此文件。
--   现改为：CREATE TABLE IF NOT EXISTS 之后逐列 ADD COLUMN IF NOT EXISTS 补齐。

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

-- 防御化：表已存在（裸骨架）时逐列补齐
ALTER TABLE tenant_permissions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL;
ALTER TABLE tenant_permissions ADD COLUMN IF NOT EXISTS user_id VARCHAR(64) NOT NULL;
ALTER TABLE tenant_permissions ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'member';
ALTER TABLE tenant_permissions ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE tenant_permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE tenant_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE tenant_permissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- 防御化：内联约束在旧表路径缺失，幂等补齐
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uk_tenant_user' AND conrelid='tenant_permissions'::regclass) THEN
        ALTER TABLE tenant_permissions ADD CONSTRAINT uk_tenant_user UNIQUE (tenant_id, user_id);
    END IF;
END $$;

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

-- 防御化：表已存在（裸骨架）时逐列补齐
ALTER TABLE tool_permissions ADD COLUMN IF NOT EXISTS tenant_permission_id BIGINT NOT NULL;
ALTER TABLE tool_permissions ADD COLUMN IF NOT EXISTS tool_name VARCHAR(64) NOT NULL;
ALTER TABLE tool_permissions ADD COLUMN IF NOT EXISTS max_permission VARCHAR(16) NOT NULL DEFAULT 'read';
ALTER TABLE tool_permissions ADD COLUMN IF NOT EXISTS allowed_operations TEXT[];
ALTER TABLE tool_permissions ADD COLUMN IF NOT EXISTS denied_operations TEXT[];
ALTER TABLE tool_permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE tool_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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
    details         JSONB,
    CONSTRAINT chk_action CHECK (action IN ('create', 'update', 'delete', 'activate', 'deactivate', 'role_change'))
);

-- 防御化：表已存在（裸骨架）时逐列补齐
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL;
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(64) NOT NULL;
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(32) NOT NULL;
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS changed_by VARCHAR(64) NOT NULL;
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

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
