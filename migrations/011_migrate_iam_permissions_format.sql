-- IAM 权限格式统一迁移脚本
-- 将旧的权限格式 (users.read, roles.create 等) 迁移到新格式 (iam:users_read, iam:roles_create 等)
-- 执行时间: 2026-06-17

BEGIN;

-- ============================================
-- 1. 更新 iam.permissions 表中的权限代码
-- ============================================

-- 用户管理权限
UPDATE iam.permissions SET code = 'iam:users_read' WHERE code = 'users.read';
UPDATE iam.permissions SET code = 'iam:users_create' WHERE code = 'users.create';
UPDATE iam.permissions SET code = 'iam:users_update' WHERE code = 'users.update';
UPDATE iam.permissions SET code = 'iam:users_delete' WHERE code = 'users.delete';

-- 角色管理权限
UPDATE iam.permissions SET code = 'iam:roles_read' WHERE code = 'roles.read';
UPDATE iam.permissions SET code = 'iam:roles_create' WHERE code = 'roles.create';
UPDATE iam.permissions SET code = 'iam:roles_update' WHERE code = 'roles.update';
UPDATE iam.permissions SET code = 'iam:roles_delete' WHERE code = 'roles.delete';

-- 权限管理权限
UPDATE iam.permissions SET code = 'iam:permissions_read' WHERE code = 'permissions.read';
UPDATE iam.permissions SET code = 'iam:permissions_update' WHERE code = 'permissions.update';

-- 系统管理权限
UPDATE iam.permissions SET code = 'iam:audit_read' WHERE code = 'audit.read';
UPDATE iam.permissions SET code = 'iam:system_read' WHERE code = 'system.read';
UPDATE iam.permissions SET code = 'iam:system_update' WHERE code = 'system.update';
UPDATE iam.permissions SET code = 'iam:system_logs' WHERE code = 'system.logs';
UPDATE iam.permissions SET code = 'iam:system_monitor' WHERE code = 'system.monitor';
UPDATE iam.permissions SET code = 'iam:system_export' WHERE code = 'system.export';
UPDATE iam.permissions SET code = 'iam:system_settings' WHERE code = 'system.settings';

-- 字典管理权限
UPDATE iam.permissions SET code = 'iam:dictionaries_read' WHERE code = 'dictionaries.read';
UPDATE iam.permissions SET code = 'iam:dictionaries_update' WHERE code = 'dictionaries.update';

-- 插件管理权限
UPDATE iam.permissions SET code = 'iam:plugins_read' WHERE code = 'plugins.read';
UPDATE iam.permissions SET code = 'iam:plugins_update' WHERE code = 'plugins.update';

-- ============================================
-- 2. 更新 iam.roles 表中的 permissions JSONB
-- ============================================

-- 管理员角色：保持 ["*"] 不变
-- 其他角色：替换旧的权限格式为新格式

-- 替换 JSONB 数组中的权限代码
UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"users.read"', '"iam:users_read"')::jsonb
WHERE permissions::text LIKE '%users.read%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"users.create"', '"iam:users_create"')::jsonb
WHERE permissions::text LIKE '%users.create%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"users.update"', '"iam:users_update"')::jsonb
WHERE permissions::text LIKE '%users.update%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"users.delete"', '"iam:users_delete"')::jsonb
WHERE permissions::text LIKE '%users.delete%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"roles.read"', '"iam:roles_read"')::jsonb
WHERE permissions::text LIKE '%roles.read%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"roles.create"', '"iam:roles_create"')::jsonb
WHERE permissions::text LIKE '%roles.create%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"roles.update"', '"iam:roles_update"')::jsonb
WHERE permissions::text LIKE '%roles.update%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"roles.delete"', '"iam:roles_delete"')::jsonb
WHERE permissions::text LIKE '%roles.delete%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"permissions.read"', '"iam:permissions_read"')::jsonb
WHERE permissions::text LIKE '%permissions.read%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"permissions.update"', '"iam:permissions_update"')::jsonb
WHERE permissions::text LIKE '%permissions.update%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"audit.read"', '"iam:audit_read"')::jsonb
WHERE permissions::text LIKE '%audit.read%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"system.read"', '"iam:system_read"')::jsonb
WHERE permissions::text LIKE '%system.read%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"system.update"', '"iam:system_update"')::jsonb
WHERE permissions::text LIKE '%system.update%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"system.settings"', '"iam:system_settings"')::jsonb
WHERE permissions::text LIKE '%system.settings%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"system.logs"', '"iam:system_logs"')::jsonb
WHERE permissions::text LIKE '%system.logs%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"system.monitor"', '"iam:system_monitor"')::jsonb
WHERE permissions::text LIKE '%system.monitor%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"system.export"', '"iam:system_export"')::jsonb
WHERE permissions::text LIKE '%system.export%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"dictionaries.read"', '"iam:dictionaries_read"')::jsonb
WHERE permissions::text LIKE '%dictionaries.read%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"dictionaries.update"', '"iam:dictionaries_update"')::jsonb
WHERE permissions::text LIKE '%dictionaries.update%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"plugins.read"', '"iam:plugins_read"')::jsonb
WHERE permissions::text LIKE '%plugins.read%';

UPDATE iam.roles
SET permissions = REPLACE(permissions::text, '"plugins.update"', '"iam:plugins_update"')::jsonb
WHERE permissions::text LIKE '%plugins.update%';

-- ============================================
-- 3. 验证迁移结果（可选）
-- ============================================

-- 查看迁移后的权限表
-- SELECT code, name FROM iam.permissions ORDER BY code;

-- 查看迁移后的角色权限
-- SELECT code, name, permissions FROM iam.roles;

COMMIT;

-- ============================================
-- 4. 回滚脚本（如需回滚）
-- ============================================
-- 执行前请先备份数据！
-- 
-- BEGIN;
-- -- 将新格式改回旧格式（反向操作）
-- UPDATE iam.permissions SET code = 'users.read' WHERE code = 'iam:users_read';
-- UPDATE iam.permissions SET code = 'users.create' WHERE code = 'iam:users_create';
-- UPDATE iam.permissions SET code = 'users.update' WHERE code = 'iam:users_update';
-- UPDATE iam.permissions SET code = 'users.delete' WHERE code = 'iam:users_delete';
-- ... 以此类推
-- COMMIT;
