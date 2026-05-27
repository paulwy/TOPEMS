-- TOPEMS IAM 数据库架构迁移
-- 创建 IAM 相关的表结构

-- 创建 IAM schema
CREATE SCHEMA IF NOT EXISTS iam;

-- 创建用户表
CREATE TABLE IF NOT EXISTS iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(512),
    department VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 创建角色表
CREATE TABLE IF NOT EXISTS iam.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建权限表
CREATE TABLE IF NOT EXISTS iam.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

-- 创建用户-角色关联表
CREATE TABLE IF NOT EXISTS iam.user_roles (
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- 创建角色-权限关联表
CREATE TABLE IF NOT EXISTS iam.role_permissions (
    role_id UUID NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES iam.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- 创建审计日志表
CREATE TABLE IF NOT EXISTS iam.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES iam.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON iam.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON iam.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON iam.users(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON iam.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON iam.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON iam.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON iam.role_permissions(role_id);

-- 插入默认管理员用户
-- 注意：密码是 'Admin123' 的 bcrypt 哈希（包含大小写字母和数字）
INSERT INTO iam.users (id, username, email, password_hash, full_name, role, is_active, is_superuser)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin',
    'admin@topems.com',
    '$2b$12$ckaJ.Wko3mpeII8ELRUroun/prc3hHlIy61bEPicbz8pXTRJ20hUm',
    'System Administrator',
    'admin',
    true,
    true
) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = CURRENT_TIMESTAMP;

-- 插入普通用户
-- 注意：密码是 'User123' 的 bcrypt 哈希（包含大小写字母和数字）
INSERT INTO iam.users (id, username, email, password_hash, full_name, role, is_active, is_superuser)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'user',
    'user@topems.com',
    '$2b$12$D35hGfBnmP5pqLU9LIhuWuQmZfdfOknQQqjg8SLldZuBx4jTNHOSC',
    'Regular User',
    'user',
    true,
    false
) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = CURRENT_TIMESTAMP;

-- 插入访客用户
-- 注意：密码是 'Guest123' 的 bcrypt 哈希（包含大小写字母和数字）
INSERT INTO iam.users (id, username, email, password_hash, full_name, role, is_active, is_superuser)
VALUES (
    'a0000000-0000-0000-0000-000000000003',
    'guest',
    'guest@topems.com',
    '$2b$12$kbpIQEbg/tjDtjgb/q14C.9Tg8/L4xZ2inRj.QUj8kLIu6nDFRQwW',
    'Guest User',
    'guest',
    true,
    false
) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = CURRENT_TIMESTAMP;

-- 插入默认角色
INSERT INTO iam.roles (id, name, description)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'admin', 'System Administrator with full access'),
    ('b0000000-0000-0000-0000-000000000002', 'user', 'Regular user with standard access'),
    ('b0000000-0000-0000-0000-000000000003', 'guest', 'Guest user with limited access')
ON CONFLICT (name) DO NOTHING;

-- 为管理员用户分配 admin 角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'admin' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 为普通用户分配 user 角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'user' AND r.name = 'user'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 为访客用户分配 guest 角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'guest' AND r.name = 'guest'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 插入默认权限
INSERT INTO iam.permissions (id, name, resource, action, description)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'read_users', 'users', 'read', 'Read user information'),
    ('c0000000-0000-0000-0000-000000000002', 'create_users', 'users', 'create', 'Create new users'),
    ('c0000000-0000-0000-0000-000000000003', 'update_users', 'users', 'update', 'Update user information'),
    ('c0000000-0000-0000-0000-000000000004', 'delete_users', 'users', 'delete', 'Delete users'),
    ('c0000000-0000-0000-0000-000000000005', 'read_roles', 'roles', 'read', 'Read role information'),
    ('c0000000-0000-0000-0000-000000000006', 'create_roles', 'roles', 'create', 'Create new roles'),
    ('c0000000-0000-0000-0000-000000000007', 'delete_roles', 'roles', 'delete', 'Delete roles'),
    ('c0000000-0000-0000-0000-000000000008', 'read_permissions', 'permissions', 'read', 'Read permission information'),
    ('c0000000-0000-0000-0000-000000000009', 'create_permissions', 'permissions', 'create', 'Create new permissions'),
    ('c0000000-0000-0000-0000-000000000010', 'delete_permissions', 'permissions', 'delete', 'Delete permissions')
ON CONFLICT (resource, action) DO NOTHING;

-- 为 admin 角色分配所有权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r, iam.permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为 user 角色分配读权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r, iam.permissions p
WHERE r.name = 'user' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
