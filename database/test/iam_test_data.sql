-- IAM 模块测试数据初始化脚本
--
-- 用于准备权限测试所需的测试账号和数据
--
-- 运行方式:
-- psql -U topems -d topems -f database/test/iam_test_data.sql

BEGIN;

-- 清理现有测试数据
DELETE FROM core_user_roles WHERE user_id IN (
    SELECT id FROM core_users WHERE username LIKE 'test_%'
);
DELETE FROM core_users WHERE username LIKE 'test_%';

-- 创建测试用户

-- 1. 管理员用户 (用于测试 IAM-003, IAM-005, IAM-006)
INSERT INTO core_users (id, username, email, password_hash, full_name, status, is_superuser, tenant_id)
VALUES (
    gen_random_uuid(),
    'test_admin',
    'test_admin@topems.test',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.TH2wTw7P6OqE1.', -- password: admin123
    '测试管理员',
    'active',
    false,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (username) DO NOTHING;

-- 2. 普通员工用户 (用于测试 IAM-002, IAM-004, IAM-009)
INSERT INTO core_users (id, username, email, password_hash, full_name, status, is_superuser, tenant_id)
VALUES (
    gen_random_uuid(),
    'test_employee',
    'test_employee@topems.test',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.TH2wTw7P6OqE1.', -- password: admin123
    '测试员工',
    'active',
    false,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (username) DO NOTHING;

-- 3. HR 管理员用户 (用于测试 HRM 权限)
INSERT INTO core_users (id, username, email, password_hash, full_name, status, is_superuser, tenant_id)
VALUES (
    gen_random_uuid(),
    'test_hr_admin',
    'test_hr_admin@topems.test',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.TH2wTw7P6OqE1.', -- password: admin123
    '测试HR管理员',
    'active',
    false,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (username) DO NOTHING;

-- 4. 项目经理用户 (用于测试 PM 权限)
INSERT INTO core_users (id, username, email, password_hash, full_name, status, is_superuser, tenant_id)
VALUES (
    gen_random_uuid(),
    'test_pm_user',
    'test_pm_user@topems.test',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.TH2wTw7P6OqE1.', -- password: admin123
    '测试项目经理',
    'active',
    false,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (username) DO NOTHING;

-- 5. 租户B用户 (用于测试跨租户访问 IAM-007)
INSERT INTO core_users (id, username, email, password_hash, full_name, status, is_superuser, tenant_id)
VALUES (
    gen_random_uuid(),
    'test_tenant_b_user',
    'test_tenant_b@topems.test',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.TH2wTw7P6OqE1.', -- password: admin123
    '租户B用户',
    'active',
    false,
    '00000000-0000-0000-0000-000000000002'
) ON CONFLICT (username) DO NOTHING;

-- 6. 禁用状态用户 (用于测试禁用用户登录)
INSERT INTO core_users (id, username, email, password_hash, full_name, status, is_superuser, tenant_id)
VALUES (
    gen_random_uuid(),
    'test_disabled_user',
    'test_disabled@topems.test',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.TH2wTw7P6OqE1.', -- password: admin123
    '禁用用户',
    'inactive',
    false,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (username) DO NOTHING;

-- 分配角色

-- 为测试管理员分配 admin 角色
INSERT INTO core_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM core_users u, core_roles r
WHERE u.username = 'test_admin' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

-- 为测试员工分配 employee 角色
INSERT INTO core_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM core_users u, core_roles r
WHERE u.username = 'test_employee' AND r.name = 'employee'
ON CONFLICT DO NOTHING;

-- 为测试HR管理员分配 hr_admin 角色
INSERT INTO core_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM core_users u, core_roles r
WHERE u.username = 'test_hr_admin' AND r.name = 'hr_admin'
ON CONFLICT DO NOTHING;

-- 为测试项目经理分配 project_manager 角色
INSERT INTO core_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM core_users u, core_roles r
WHERE u.username = 'test_pm_user' AND r.name = 'project_manager'
ON CONFLICT DO NOTHING;

-- 输出测试数据统计
SELECT '=== IAM 测试数据初始化完成 ===' as status;

SELECT
    '测试用户' as info,
    COUNT(*) as count
FROM core_users
WHERE username LIKE 'test_%';

SELECT
    '用户角色分配' as info,
    COUNT(*) as count
FROM core_user_roles ur
JOIN core_users u ON ur.user_id = u.id
WHERE u.username LIKE 'test_%';

-- 显示测试账号信息
SELECT
    u.username,
    u.email,
    u.full_name,
    u.status,
    r.name as role_name,
    u.tenant_id
FROM core_users u
LEFT JOIN core_user_roles ur ON u.id = ur.user_id
LEFT JOIN core_roles r ON ur.role_id = r.id
WHERE u.username LIKE 'test_%'
ORDER BY u.username;

COMMIT;

-- 测试账号信息
--
-- | 用户名 | 密码 | 角色 | 用途 |
-- |--------|------|------|------|
-- | test_admin | admin123 | admin | 管理员测试 |
-- | test_employee | admin123 | employee | 普通员工测试 |
-- | test_hr_admin | admin123 | hr_admin | HR管理员测试 |
-- | test_pm_user | admin123 | project_manager | 项目经理测试 |
-- | test_tenant_b_user | admin123 | employee | 跨租户测试 |
-- | test_disabled_user | admin123 | - | 禁用用户测试 |
