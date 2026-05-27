-- TOPEMS IAM Schema Migration
-- Create access_logs table
CREATE TABLE IF NOT EXISTS iam.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON iam.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON iam.access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON iam.access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_resource ON iam.access_logs(resource);

-- Add is_superuser field to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'iam' AND table_name = 'users' AND column_name = 'is_superuser'
    ) THEN
        ALTER TABLE iam.users ADD COLUMN is_superuser BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add created_at and updated_at to roles if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'iam' AND table_name = 'roles' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE iam.roles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create default roles
INSERT INTO iam.roles (id, name, description, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', '管理员', '系统管理员，拥有所有权限', NOW()),
    ('00000000-0000-0000-0000-000000000002', '部门经理', '部门经理，拥有本部门所有权限', NOW()),
    ('00000000-0000-0000-0000-000000000003', '普通员工', '普通员工，拥有基础操作权限', NOW()),
    ('00000000-0000-0000-0000-000000000004', '访客', '访客，只读权限', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create default permissions
INSERT INTO iam.permissions (id, name, resource, action, description)
VALUES
    -- RS (Research System) 模块权限
    ('00000001-0000-0000-0000-000000000001', 'rs:read', 'rs', 'read', '读取科研研发数据'),
    ('00000001-0000-0000-0000-000000000002', 'rs:write', 'rs', 'write', '创建和编辑科研研发数据'),
    ('00000001-0000-0000-0000-000000000003', 'rs:delete', 'rs', 'delete', '删除科研研发数据'),
    ('00000001-0000-0000-0000-000000000004', 'rs:admin', 'rs', 'admin', '科研研发管理权限'),

    -- LIMS (Laboratory Information Management System) 模块权限
    ('00000002-0000-0000-0000-000000000001', 'lims:read', 'lims', 'read', '读取实验室数据'),
    ('00000002-0000-0000-0000-000000000002', 'lims:write', 'lims', 'write', '创建和编辑实验室数据'),
    ('00000002-0000-0000-0000-000000000003', 'lims:delete', 'lims', 'delete', '删除实验室数据'),
    ('00000002-0000-0000-0000-000000000004', 'lims:admin', 'lims', 'admin', '实验室管理权限'),

    -- QMS (Quality Management System) 模块权限
    ('00000003-0000-0000-0000-000000000001', 'qms:read', 'qms', 'read', '读取质量管理数据'),
    ('00000003-0000-0000-0000-000000000002', 'qms:write', 'qms', 'write', '创建和编辑质量管理数据'),
    ('00000003-0000-0000-0000-000000000003', 'qms:delete', 'qms', 'delete', '删除质量管理数据'),
    ('00000003-0000-0000-0000-000000000004', 'qms:admin', 'qms', 'admin', '质量管理权限'),

    -- EHS (Environment, Health, Safety) 模块权限
    ('00000004-0000-0000-0000-000000000001', 'ehs:read', 'ehs', 'read', '读取环境健康安全数据'),
    ('00000004-0000-0000-0000-000000000002', 'ehs:write', 'ehs', 'write', '创建和编辑环境健康安全数据'),
    ('00000004-0000-0000-0000-000000000003', 'ehs:delete', 'ehs', 'delete', '删除环境健康安全数据'),
    ('00000004-0000-0000-0000-000000000004', 'ehs:admin', 'ehs', 'admin', '环境健康安全管理权限'),

    -- SRM (Supplier Relationship Management) 模块权限
    ('00000005-0000-0000-0000-000000000001', 'srm:read', 'srm', 'read', '读取供应商关系数据'),
    ('00000005-0000-0000-0000-000000000002', 'srm:write', 'srm', 'write', '创建和编辑供应商关系数据'),
    ('00000005-0000-0000-0000-000000000003', 'srm:delete', 'srm', 'delete', '删除供应商关系数据'),
    ('00000005-0000-0000-0000-000000000004', 'srm:admin', 'srm', 'admin', '供应商关系管理权限'),

    -- PDM (Product Data Management) 模块权限
    ('00000006-0000-0000-0000-000000000001', 'pdm:read', 'pdm', 'read', '读取生产数据管理数据'),
    ('00000006-0000-0000-0000-000000000002', 'pdm:write', 'pdm', 'write', '创建和编辑生产数据管理数据'),
    ('00000006-0000-0000-0000-000000000003', 'pdm:delete', 'pdm', 'delete', '删除生产数据管理数据'),
    ('00000006-0000-0000-0000-000000000004', 'pdm:admin', 'pdm', 'admin', '生产数据管理权限'),

    -- Workflow 模块权限
    ('00000007-0000-0000-0000-000000000001', 'workflow:read', 'workflow', 'read', '读取工作流数据'),
    ('00000007-0000-0000-0000-000000000002', 'workflow:write', 'workflow', 'write', '创建和编辑工作流'),
    ('00000007-0000-0000-0000-000000000003', 'workflow:approve', 'workflow', 'approve', '审批工作流'),
    ('00000007-0000-0000-0000-000000000004', 'workflow:reject', 'workflow', 'reject', '拒绝工作流'),
    ('00000007-0000-0000-0000-000000000005', 'workflow:admin', 'workflow', 'admin', '工作流管理权限'),

    -- Document 模块权限
    ('00000008-0000-0000-0000-000000000001', 'doc:read', 'doc', 'read', '读取文档'),
    ('00000008-0000-0000-0000-000000000002', 'doc:write', 'doc', 'write', '上传和编辑文档'),
    ('00000008-0000-0000-0000-000000000003', 'doc:delete', 'doc', 'delete', '删除文档'),
    ('00000008-0000-0000-0000-000000000004', 'doc:admin', 'doc', 'admin', '文档管理权限'),

    -- AI 模块权限
    ('00000009-0000-0000-0000-000000000001', 'ai:read', 'ai', 'read', '读取AI知识库'),
    ('00000009-0000-0000-0000-000000000002', 'ai:write', 'ai', 'write', '添加和编辑AI知识'),
    ('00000009-0000-0000-0000-000000000003', 'ai:delete', 'ai', 'delete', '删除AI知识'),
    ('00000009-0000-0000-0000-000000000004', 'ai:admin', 'ai', 'admin', 'AI知识库管理权限'),

    -- User Management 权限
    ('00000000-0000-0000-0000-000000000010', 'user:read', 'user', 'read', '读取用户信息'),
    ('00000000-0000-0000-0000-000000000011', 'user:write', 'user', 'write', '创建和编辑用户'),
    ('00000000-0000-0000-0000-000000000012', 'user:delete', 'user', 'delete', '删除用户'),
    ('00000000-0000-0000-0000-000000000013', 'user:admin', 'user', 'admin', '用户管理权限'),

    -- Role Management 权限
    ('00000000-0000-0000-0000-000000000014', 'role:read', 'role', 'read', '读取角色信息'),
    ('00000000-0000-0000-0000-000000000015', 'role:write', 'role', 'write', '创建和编辑角色'),
    ('00000000-0000-0000-0000-000000000016', 'role:delete', 'role', 'delete', '删除角色'),
    ('00000000-0000-0000-0000-000000000017', 'role:admin', 'role', 'admin', '角色管理权限'),

    -- System 权限
    ('00000000-0000-0000-0000-000000000020', 'system:read', 'system', 'read', '读取系统配置'),
    ('00000000-0000-0000-0000-000000000021', 'system:write', 'system', 'write', '修改系统配置'),
    ('00000000-0000-0000-0000-000000000022', 'system:admin', 'system', 'admin', '系统管理权限')
ON CONFLICT (id) DO NOTHING;

-- Assign permissions to roles
-- 管理员拥有所有权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM iam.permissions
ON CONFLICT DO NOTHING;

-- 部门经理拥有读、写、管理权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id
FROM iam.permissions
WHERE action IN ('read', 'write', 'admin')
   OR action IN ('approve', 'reject')
ON CONFLICT DO NOTHING;

-- 普通员工拥有读写权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id
FROM iam.permissions
WHERE action IN ('read', 'write')
ON CONFLICT DO NOTHING;

-- 访客只有读权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id
FROM iam.permissions
WHERE action = 'read'
ON CONFLICT DO NOTHING;

-- Assign admin role to default admin user (if exists)
INSERT INTO iam.user_roles (user_id, role_id, created_at)
SELECT id, '00000000-0000-0000-0000-000000000001', NOW()
FROM iam.users
WHERE username = 'admin'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE iam.access_logs IS '用户访问日志表';
COMMENT ON COLUMN iam.access_logs.user_id IS '用户ID';
COMMENT ON COLUMN iam.access_logs.action IS '操作类型：login, logout, check_permission, create, update, delete等';
COMMENT ON COLUMN iam.access_logs.resource IS '资源类型：rs, lims, qms, ehs, srm, pdm, workflow等';
COMMENT ON COLUMN iam.access_logs.success IS '操作是否成功';
