-- TOPEMS IAM 数据库架构迁移
-- 创建 IAM 相关的表结构

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建 IAM schema
CREATE SCHEMA IF NOT EXISTS iam;

-- 用户表
CREATE TABLE IF NOT EXISTS iam.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 角色表
CREATE TABLE IF NOT EXISTS iam.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS iam.user_roles (
    user_id UUID REFERENCES iam.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 权限表
CREATE TABLE IF NOT EXISTS iam.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS iam.role_permissions (
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS iam.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES iam.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
-- 注意：密码是 'admin123' 的 bcrypt 哈希
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser, is_active)
VALUES (
    'admin',
    'admin@topems.com',
    '$2b$12$H4IHbFRqjjFSRy6tTWnlZeT3b5iHFrALcfBAUstpE8gOZi3blVINy',
    '系统管理员',
    TRUE,
    TRUE
)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_superuser = EXCLUDED.is_superuser,
    is_active = EXCLUDED.is_active;

-- 插入普通用户
-- 注意：密码是 'user123' 的 bcrypt 哈希
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser, is_active)
VALUES (
    'user',
    'user@topems.com',
    '$2b$12$01KTZjzKbR6oWpUkl.1Yu.SdZ721sCrtoG0NYIJGHSl0n0gPk8QQu',
    '普通用户',
    FALSE,
    TRUE
)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_superuser = EXCLUDED.is_superuser,
    is_active = EXCLUDED.is_active;

-- 插入访客用户
-- 注意：密码是 'guest123' 的 bcrypt 哈希
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser, is_active)
VALUES (
    'guest',
    'guest@topems.com',
    '$2b$12$SUV5f8K6jn8gSPmUSFS.Fu7e7k4bF5RcwLxNuqDXlcgvcglkHrARy',
    '访客用户',
    FALSE,
    TRUE
)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_superuser = EXCLUDED.is_superuser,
    is_active = EXCLUDED.is_active;

-- 插入默认角色（中文名称）
INSERT INTO iam.roles (name, description)
VALUES 
    ('管理员', '拥有所有权限的管理员角色'),
    ('普通用户', '普通用户角色'),
    ('访客', '访客角色')
ON CONFLICT (name) DO NOTHING;

-- 为管理员用户分配管理员角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'admin' AND r.name = '管理员'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 为普通用户分配普通用户角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'user' AND r.name = '普通用户'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 为访客用户分配访客角色
INSERT INTO iam.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM iam.users u, iam.roles r
WHERE u.username = 'guest' AND r.name = '访客'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 插入默认权限
INSERT INTO iam.permissions (name, resource, action, description)
VALUES 
    ('rs_read', 'rs', 'read', 'RS模块读取权限'),
    ('rs_write', 'rs', 'write', 'RS模块写入权限'),
    ('rs_delete', 'rs', 'delete', 'RS模块删除权限'),
    ('rs_admin', 'rs', 'admin', 'RS模块管理权限'),
    ('lims_read', 'lims', 'read', 'LIMS模块读取权限'),
    ('lims_write', 'lims', 'write', 'LIMS模块写入权限'),
    ('lims_delete', 'lims', 'delete', 'LIMS模块删除权限'),
    ('lims_admin', 'lims', 'admin', 'LIMS模块管理权限'),
    ('qms_read', 'qms', 'read', 'QMS模块读取权限'),
    ('qms_write', 'qms', 'write', 'QMS模块写入权限'),
    ('qms_delete', 'qms', 'delete', 'QMS模块删除权限'),
    ('qms_admin', 'qms', 'admin', 'QMS模块管理权限'),
    ('ehs_read', 'ehs', 'read', 'EHS模块读取权限'),
    ('ehs_write', 'ehs', 'write', 'EHS模块写入权限'),
    ('ehs_delete', 'ehs', 'delete', 'EHS模块删除权限'),
    ('ehs_admin', 'ehs', 'admin', 'EHS模块管理权限'),
    ('srm_read', 'srm', 'read', 'SRM模块读取权限'),
    ('srm_write', 'srm', 'write', 'SRM模块写入权限'),
    ('srm_delete', 'srm', 'delete', 'SRM模块删除权限'),
    ('srm_admin', 'srm', 'admin', 'SRM模块管理权限'),
    ('pdm_read', 'pdm', 'read', 'PDM模块读取权限'),
    ('pdm_write', 'pdm', 'write', 'PDM模块写入权限'),
    ('pdm_delete', 'pdm', 'delete', 'PDM模块删除权限'),
    ('pdm_admin', 'pdm', 'admin', 'PDM模块管理权限'),
    ('workflow_read', 'workflow', 'read', 'Workflow模块读取权限'),
    ('workflow_write', 'workflow', 'write', 'Workflow模块写入权限'),
    ('workflow_delete', 'workflow', 'delete', 'Workflow模块删除权限'),
    ('workflow_admin', 'workflow', 'admin', 'Workflow模块管理权限'),
    ('doc_read', 'doc', 'read', '文档模块读取权限'),
    ('doc_write', 'doc', 'write', '文档模块写入权限'),
    ('doc_delete', 'doc', 'delete', '文档模块删除权限'),
    ('doc_admin', 'doc', 'admin', '文档模块管理权限'),
    ('ai_read', 'ai', 'read', 'AI模块读取权限'),
    ('ai_write', 'ai', 'write', 'AI模块写入权限'),
    ('ai_delete', 'ai', 'delete', 'AI模块删除权限'),
    ('ai_admin', 'ai', 'admin', 'AI模块管理权限'),
    ('mail_read', 'mail', 'read', '邮件模块读取权限'),
    ('mail_write', 'mail', 'write', '邮件模块写入权限'),
    ('mail_delete', 'mail', 'delete', '邮件模块删除权限'),
    ('mail_admin', 'mail', 'admin', '邮件模块管理权限')
ON CONFLICT (name) DO NOTHING;

-- 为管理员角色分配所有权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r, iam.permissions p
WHERE r.name = '管理员'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为普通用户角色分配只读权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r, iam.permissions p
WHERE r.name = '普通用户' 
  AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为访客角色分配部分只读权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r, iam.permissions p
WHERE r.name = '访客' 
  AND p.action = 'read'
  AND p.resource IN ('rs', 'lims', 'qms', 'ehs', 'srm', 'pdm')
ON CONFLICT (role_id, permission_id) DO NOTHING;