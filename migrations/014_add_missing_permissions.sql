-- ============================================================
-- TOPEMS 权限系统补充迁移脚本
-- 文件: migrations/014_add_missing_permissions.sql
-- 说明: 添加缺失的模块权限（dashboard、system等）
-- 适用: 已有权限系统的升级
-- ============================================================

-- ============================================================
-- 第一部分：添加 Dashboard 模块权限
-- ============================================================

INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('dashboard:read', '仪表盘-只读', '查看仪表盘和首页数据', 'dashboard', 'read', 1),
('dashboard:write', '仪表盘-写入', '自定义仪表盘配置', 'dashboard', 'write', 2),
('dashboard:admin', '仪表盘-管理', '管理所有仪表盘配置', 'dashboard', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 第二部分：修正 System 模块权限格式
-- 说明: 现有 system:settings 等不符合 module:action 格式
-- ============================================================

-- 确保标准格式的 system 权限存在
INSERT INTO core_permissions (code, name, description, resource, action, level) VALUES
('system:read', '系统管理-只读', '查看系统配置信息', 'system', 'read', 1),
('system:write', '系统管理-写入', '修改系统配置', 'system', 'write', 2),
('system:delete', '系统管理-删除', '删除系统配置', 'system', 'delete', 3),
('system:admin', '系统管理-管理', '完整管理系统模块', 'system', 'admin', 4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 第三部分：为超级管理员分配新增权限
-- ============================================================

INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'superadmin' 
AND p.resource = 'dashboard'
ON CONFLICT DO NOTHING;

INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'admin' 
AND p.resource = 'dashboard'
ON CONFLICT DO NOTHING;

-- 为超级管理员分配 system 标准权限
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'superadmin' 
AND p.resource = 'system'
AND p.action IN ('read', 'write', 'delete', 'admin')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 第四部分：为普通员工分配 dashboard 只读权限
-- ============================================================

INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM core_roles r, core_permissions p 
WHERE r.name = 'employee' 
AND p.code = 'dashboard:read'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 第五部分：显示迁移结果
-- ============================================================

SELECT '=== 缺失权限补充迁移完成 ===' AS status;

SELECT '新增权限统计:' AS info;
SELECT resource, action, COUNT(*)::TEXT AS count 
FROM core_permissions 
WHERE resource IN ('dashboard', 'system')
GROUP BY resource, action 
ORDER BY resource, action;
