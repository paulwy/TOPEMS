-- ================================================================================
-- 20260825000000_rebuild_permission_tables.sql
-- 空库重建权限表重建（v448 的 BIGSERIAL 骨架类型对齐）
-- ================================================================================
-- 背景（2026-09-18 全链验证发现）：空库重建时早期迁移先创建了 tenant_permissions /
-- permission_audit_logs 的裸骨架（id UUID + deleted_at），tool_permissions 缺失；
-- 20260827000000_v448 的 CREATE TABLE IF NOT EXISTS 对已有骨架静默跳过，
-- 且其 BIGSERIAL/BIGINT 体系与骨架 uuid id 类型冲突，FK 无法建立
-- （foreign key constraint ... cannot be implemented）。
-- 本迁移在 v448 之前重建 3 张表为 v448 期望的完整 BIGSERIAL 结构。
-- 仅作用于空库重建路径（5433 测试容器/新环境）；5432 活跃库不应用本迁移
-- （用户决策：活跃库不跑历史遗留迁移；其权限表由 iam schema 权威管理）。
-- 幂等：DROP TABLE IF EXISTS + CREATE TABLE IF NOT EXISTS。
-- ================================================================================

DROP TABLE IF EXISTS tenant_permissions CASCADE;
DROP TABLE IF EXISTS tool_permissions CASCADE;
DROP TABLE IF EXISTS permission_audit_logs CASCADE;

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

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON permission_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON permission_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON permission_audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON permission_audit_logs(changed_by);
