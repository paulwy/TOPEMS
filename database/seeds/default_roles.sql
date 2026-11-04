-- ============================================================================
-- database/seeds/default_roles.sql
--
-- 默认角色 seed（3 个系统内置角色）
--
-- 角色说明：
--   super_admin  超级管理员 - 所有权限（is_system=true）
--   dept_manager 部门经理   - 本部门数据管理权限
--   employee     普通员工   - 基础查看权限
--
-- 用法：
--   psql -U topems_prod -d topems_prod -f database/seeds/default_roles.sql
-- ============================================================================

-- ── 超级管理员 ──
INSERT INTO iam.roles (id, code, name, description, permissions, is_system, status, created_at, updated_at) VALUES
('33333333-3333-3333-3333-333333333001', 'super_admin', '超级管理员', '拥有系统全部权限，可管理所有模块和用户',
 '["*"]'::jsonb,
 true, 'active', NOW(), NOW());

-- ── 部门经理 ──
INSERT INTO iam.roles (id, code, name, description, permissions, is_system, status, created_at, updated_at) VALUES
('33333333-3333-3333-3333-333333333002', 'dept_manager', '部门经理', '管理本部门员工、审批本部门业务流程',
 '["hrm:read", "hrm:write", "attendance:read", "attendance:approve", "recruitment:read", "recruitment:write"]'::jsonb,
 true, 'active', NOW(), NOW());

-- ── 普通员工 ──
INSERT INTO iam.roles (id, code, name, description, permissions, is_system, status, created_at, updated_at) VALUES
('33333333-3333-3333-3333-333333333003', 'employee', '普通员工', '基础自助权限：查看个人信息、申请请假、查看工资条',
 '["self:read", "self:write", "attendance:apply", "leave:apply", "payroll:read"]'::jsonb,
 true, 'active', NOW(), NOW());

-- ── 把 admin 用户关联到超级管理员角色 ──
UPDATE iam.users
SET role_id = '33333333-3333-3333-3333-333333333001',
    updated_at = NOW()
WHERE username = 'admin';

-- 验证
SELECT code, name, is_system, jsonb_array_length(permissions) AS perm_count
FROM iam.roles
WHERE deleted_at IS NULL
ORDER BY created_at;

SELECT username, role_id, is_superuser
FROM iam.users
WHERE username = 'admin';
