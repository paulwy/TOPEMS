-- ============================================================
-- TOPEMS 权限系统增量迁移脚本
-- 文件: migrations/012_init_module_permissions.sql
-- 说明: 为现有系统添加缺失的模块权限
-- 适用: 已有权限系统的升级
-- ============================================================

-- ============================================================
-- 第一部分：添加缺失的模块权限
-- ============================================================

-- QMS 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('qms:read', '质量管理-只读', '查看质量标准和审核记录', 'qms', 'read', 1),
('qms:write', '质量管理-写入', '创建和修改质量标准', 'qms', 'write', 2),
('qms:delete', '质量管理-删除', '删除质量标准', 'qms', 'delete', 3),
('qms:admin', '质量管理-管理', '完整管理质量模块', 'qms', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- EHS 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('ehs:read', '环境健康安全-只读', '查看环境和安全信息', 'ehs', 'read', 1),
('ehs:write', '环境健康安全-写入', '创建和修改环境和安全记录', 'ehs', 'write', 2),
('ehs:delete', '环境健康安全-删除', '删除环境和安全记录', 'ehs', 'delete', 3),
('ehs:admin', '环境健康安全-管理', '完整管理EHS模块', 'ehs', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- MES 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('mes:read', '制造执行-只读', '查看生产执行数据', 'mes', 'read', 1),
('mes:write', '制造执行-写入', '创建和修改生产任务', 'mes', 'write', 2),
('mes:delete', '制造执行-删除', '删除生产任务', 'mes', 'delete', 3),
('mes:admin', '制造执行-管理', '完整管理MES模块', 'mes', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- WMS 模块权限
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('wms:read', '仓储管理-只读', '查看仓储和库存信息', 'wms', 'read', 1),
('wms:write', '仓储管理-写入', '创建和修改仓储数据', 'wms', 'write', 2),
('wms:delete', '仓储管理-删除', '删除仓储数据', 'wms', 'delete', 3),
('wms:admin', '仓储管理-管理', '完整管理WMS模块', 'wms', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 第二部分：添加系统设置权限
-- ============================================================

INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('system:settings', '系统设置', '修改系统配置', 'system', 'settings', 4),
('system:monitor', '系统监控', '查看系统监控', 'system', 'monitor', 1),
('system:audit', '审计日志', '查看审计日志', 'system', 'audit', 1),
('system:dictionary', '字典管理', '管理系统字典', 'system', 'dictionary', 3),
('system:plugin', '插件管理', '管理插件', 'system', 'plugin', 4),
('system:migration', '数据迁移', '执行数据迁移', 'system', 'migration', 4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 第三部分：确保租户表存在并初始化
-- ============================================================

-- 创建 tenants 表（如果不存在）
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(128) NOT NULL DEFAULT 'Default Tenant',
    slug VARCHAR(64) NOT NULL DEFAULT 'default',
    status VARCHAR(32) DEFAULT 'active',
    plan VARCHAR(32) DEFAULT 'enterprise',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入默认租户（On-Premise 模式）
INSERT INTO tenants (id, name, slug, status, plan)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Tenant',
    'default',
    'active',
    'enterprise'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 第四部分：确保 core_users 表有 tenant_id 列
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'core_users' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE core_users ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
    END IF;
END $$;

-- ============================================================
-- 第五部分：确保 core_roles 表有 tenant_id 列
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'core_roles' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE core_roles ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
    END IF;
END $$;

-- ============================================================
-- 第六部分：确保权限表有 level 列
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'core_permissions' AND column_name = 'level'
    ) THEN
        ALTER TABLE core_permissions ADD COLUMN level INTEGER DEFAULT 1;
    END IF;
END $$;

-- ============================================================
-- 第七部分：创建缺失的角色
-- ============================================================

-- HR 管理员
INSERT INTO core_roles (name, description, tenant_id)
VALUES ('hr_admin', 'HR管理员 - 人力资源管理权限', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- 项目经理
INSERT INTO core_roles (name, description, tenant_id)
VALUES ('project_manager', '项目经理 - 项目管理权限', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- 普通员工
INSERT INTO core_roles (name, description, tenant_id)
VALUES ('employee', '普通员工 - 基础访问权限', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 第八部分：分配新角色权限
-- ============================================================

-- 为超级管理员分配新增的模块权限
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'superadmin' 
AND p.resource IN ('qms', 'ehs', 'mes', 'wms')
ON CONFLICT DO NOTHING;

-- 为管理员分配新增的模块权限
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'admin' 
AND p.resource IN ('qms', 'ehs', 'mes', 'wms')
ON CONFLICT DO NOTHING;

-- 为 HR 管理员分配 HRM 和新增权限
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'hr_admin' 
AND (
    p.code LIKE 'hrm:%'
    OR p.code LIKE 'iam:read'
    OR p.code LIKE 'doc:read'
    OR p.code LIKE 'file:read'
    OR p.code LIKE 'im:read'
)
ON CONFLICT DO NOTHING;

-- 为项目经理分配 PM 和新增权限
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'project_manager' 
AND (
    p.code LIKE 'pm:%'
    OR p.code LIKE 'workflow:read'
    OR p.code LIKE 'workflow:approve'
    OR p.code LIKE 'doc:read'
    OR p.code LIKE 'doc:write'
)
ON CONFLICT DO NOTHING;

-- 为普通员工分配基础权限
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'employee' 
AND (
    p.action = 'read'
    OR p.code IN ('doc:write', 'file:write', 'im:write')
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 第九部分：为所有用户设置默认租户
-- ============================================================

UPDATE core_users SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

UPDATE core_roles SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- ============================================================
-- 第十部分：创建索引（如果不存在）
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_core_users_tenant_id ON core_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_roles_tenant_id ON core_roles(tenant_id);

-- ============================================================
-- 第十一部分：显示迁移结果
-- ============================================================

SELECT '=== 权限系统迁移完成 ===' AS status;

SELECT '新增权限统计:' AS info;
SELECT resource, action, COUNT(*)::TEXT AS count 
FROM core_permissions 
WHERE resource IN ('qms', 'ehs', 'mes', 'wms', 'system')
GROUP BY resource, action 
ORDER BY resource, action;

SELECT '角色权限分配统计:' AS info;
SELECT r.name AS role, COUNT(*)::TEXT AS permission_count
FROM core_roles r
LEFT JOIN core_role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY r.name;
