-- V19.2 数据迁移：srm 权限字符串从 scm:* 拆分为 srm:*
-- 策略：保留 scm:* 不变，新增 srm:* 并复制角色关联
-- 背景：V19.2 将 srm 服务的 ModuleCode 从 Scm 改为 Srm，
--       导致权限字符串从 scm:* 变为 srm:*，
--       需为已分配 scm:* 权限的角色补充 srm:* 权限

BEGIN;

-- 1. 新增 srm:* 权限定义（如果不存在）
INSERT INTO core_permissions (code, name, description, resource, action, level)
VALUES
    ('srm:read',   '供应商关系-只读', '查看供应商关系数据',       'srm', 'read',   1),
    ('srm:write',  '供应商关系-写入', '创建和修改供应商关系数据',   'srm', 'write',  2),
    ('srm:delete', '供应商关系-删除', '删除供应商关系数据',       'srm', 'delete', 3),
    ('srm:admin',  '供应商关系-管理', '完整管理供应商关系模块',     'srm', 'admin',  4)
ON CONFLICT (code) DO NOTHING;

-- 2. 复制 scm:* 角色权限关联到 srm:*（保留原 scm:* 关联不变）
INSERT INTO core_role_permissions (role_id, permission_id, tenant_id)
SELECT
    rp.role_id,
    sp.id,
    rp.tenant_id
FROM core_role_permissions rp
JOIN core_permissions p  ON p.id  = rp.permission_id
JOIN core_permissions sp ON sp.code = REPLACE(p.code, 'scm:', 'srm:')
WHERE p.code IN ('scm:read', 'scm:write', 'scm:delete', 'scm:admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. 确保超级管理员角色拥有所有 srm:* 权限
INSERT INTO core_role_permissions (role_id, permission_id, tenant_id)
SELECT r.id, p.id, NULL
FROM core_roles r, core_permissions p
WHERE r.name = 'superadmin'
  AND p.code LIKE 'srm:%'
ON CONFLICT DO NOTHING;

-- 4. 确保管理员角色拥有 srm:admin
INSERT INTO core_role_permissions (role_id, permission_id, tenant_id)
SELECT r.id, p.id, NULL
FROM core_roles r, core_permissions p
WHERE r.name = 'admin' AND p.code = 'srm:admin'
ON CONFLICT DO NOTHING;

-- 5. 同步 iam.permissions 表（如果存在）
INSERT INTO iam.permissions (id, code, name, description, module, resource, action)
VALUES
    ('00000005-0000-0000-0000-000000000001', 'srm:read',   '读取供应商关系数据',       '供应商关系管理', 'srm', 'srm', 'read'),
    ('00000005-0000-0000-0000-000000000002', 'srm:write',  '创建和编辑供应商关系数据', '供应商关系管理', 'srm', 'srm', 'write'),
    ('00000005-0000-0000-0000-000000000003', 'srm:delete', '删除供应商关系数据',       '供应商关系管理', 'srm', 'srm', 'delete'),
    ('00000005-0000-0000-0000-000000000004', 'srm:admin',  '供应商关系管理权限',       '供应商关系管理', 'srm', 'srm', 'admin')
ON CONFLICT (id) DO UPDATE SET
    code        = EXCLUDED.code,
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    module      = EXCLUDED.module,
    resource    = EXCLUDED.resource,
    action      = EXCLUDED.action;

-- 6. 同步 iam.role_permissions（复制 scm:* 到 srm:*）
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT rp.role_id, sp.id
FROM iam.role_permissions rp
JOIN iam.permissions p  ON p.id  = rp.permission_id
JOIN iam.permissions sp ON sp.code = REPLACE(p.code, 'scm:', 'srm:')
WHERE p.code IN ('scm:read', 'scm:write', 'scm:delete', 'scm:admin')
ON CONFLICT DO NOTHING;

COMMIT;

-- 验证迁移结果
SELECT 'core_permissions srm count' AS check_point, COUNT(*)::TEXT AS count
FROM core_permissions WHERE code LIKE 'srm:%';
