-- ================================================================================
-- 20260716000000_create_iam_base_tables.sql — 补齐 iam 基础表（roles/users）
-- ================================================================================
-- 背景：database/migrations/20260716000001_create_positions_table.sql 引用
--   iam.roles(id) 与 iam.users(id) 作为外键，但迁移体系此前从未创建这两张
--   基础表（旧库 5432 中它们由历史遗留 DDL 创建，空库重建时缺失，导致
--   sqlx migrate run 在 20260716000001 报 "relation \"iam.roles\" does not exist"）。
-- 本迁移在 20260716000001 之前执行，按 5432 旧库权威结构补齐基础表。
--
-- 幂等：CREATE TABLE IF NOT EXISTS 对已存在的表零副作用，5432 旧库可直接跳过。
-- ================================================================================

CREATE TABLE IF NOT EXISTS iam.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_by UUID,
    updated_by UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
    UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    role_id UUID REFERENCES iam.roles(id),
    department_id UUID,
    position VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT false,
    phone_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at timestamptz,
    last_login_ip INET,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at timestamptz,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    created_by UUID,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_superuser BOOLEAN NOT NULL DEFAULT false,
    roles TEXT[],
    permissions TEXT[],
    deleted_at timestamptz,
    UNIQUE (username),
    UNIQUE (email)
);

-- 常用查询索引（与 5432 旧库对齐）
CREATE INDEX IF NOT EXISTS idx_roles_status ON iam.roles(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON iam.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON iam.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON iam.users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON iam.users(status);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON iam.users(department_id);
