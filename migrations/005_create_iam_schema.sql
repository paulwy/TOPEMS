-- IAM 服务数据库迁移脚本
-- 创建于 2024

-- 创建 iam schema
CREATE SCHEMA IF NOT EXISTS iam;

-- 角色表
CREATE TABLE IF NOT EXISTS iam.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT FALSE,
    created_by UUID,
    updated_by UUID,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iam_roles_code ON iam.roles(code);
CREATE INDEX idx_iam_roles_status ON iam.roles(status);

-- 用户表
CREATE TABLE IF NOT EXISTS iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    role_id UUID REFERENCES iam.roles(id),
    department_id UUID,
    position VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    must_change_password BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iam_users_username ON iam.users(username);
CREATE INDEX idx_iam_users_email ON iam.users(email);
CREATE INDEX idx_iam_users_status ON iam.users(status);
CREATE INDEX idx_iam_users_role_id ON iam.users(role_id);

-- 刷新令牌表
CREATE TABLE IF NOT EXISTS iam.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iam_refresh_tokens_user_id ON iam.refresh_tokens(user_id);
CREATE INDEX idx_iam_refresh_tokens_token_hash ON iam.refresh_tokens(token_hash);
CREATE INDEX idx_iam_refresh_tokens_expires_at ON iam.refresh_tokens(expires_at);

-- 权限表
CREATE TABLE IF NOT EXISTS iam.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iam_permissions_code ON iam.permissions(code);
CREATE INDEX idx_iam_permissions_module ON iam.permissions(module);

-- 会话表
CREATE TABLE IF NOT EXISTS iam.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iam_sessions_user_id ON iam.sessions(user_id);
CREATE INDEX idx_iam_sessions_token_hash ON iam.sessions(token_hash);

-- 操作日志表
CREATE TABLE IF NOT EXISTS iam.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES iam.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iam_audit_logs_user_id ON iam.audit_logs(user_id);
CREATE INDEX idx_iam_audit_logs_action ON iam.audit_logs(action);
CREATE INDEX idx_iam_audit_logs_created_at ON iam.audit_logs(created_at DESC);

-- 插入默认角色
INSERT INTO iam.roles (code, name, description, permissions, is_system)
VALUES
    ('admin', '管理员', '系统管理员，拥有所有权限', '["*"]', TRUE),
    ('user', '普通用户', '普通用户，拥有基本权限', '["read:own", "update:own", "profile:read", "profile:update"]', TRUE),
    ('hrm_manager', 'HR经理', '人力资源经理', '["hrm:*", "read:own", "update:own"]', TRUE),
    ('hrm_operator', 'HR专员', '人力资源专员', '["hrm:read", "hrm:create", "hrm:update", "read:own"]', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 插入默认管理员用户 (密码: admin123)
INSERT INTO iam.users (username, email, password_hash, full_name, role_id, status, email_verified)
SELECT 'admin', 'admin@topems.com', '$argon2id$v=19$m=19456,t=2,p=1$...', '系统管理员', id, 'active', TRUE
FROM iam.roles WHERE code = 'admin'
ON CONFLICT (username) DO NOTHING;
