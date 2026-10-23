-- ============================================================================
-- 20261023000004_master_data_mdm_permissions.sql
--
-- §4 五环节全链路串联（v1.97）前置：master-data 模块权限授权。
--
-- 背景：master-data 聚合面路由此前用 `require_permission("master-data:admin")`
-- 精确匹配全局伞码，而字典中根本不存在 master-data 权限码（超管靠短路放行），
-- 普通业务角色（tenant2）建物料 403。v1.97 将聚合面中间件对齐 v1.91 的
-- `require_module_access("master-data")` 前缀判定，并为本模块补 read/write
-- 总码 + 绑定供应链 manager（scm_manager / wms_manager）→ 普通租户可建物料
-- 且 tenant 落真实 002。
--
-- 幂等保证：字典 INSERT ON CONFLICT (code) DO NOTHING；角色绑定 INSERT
-- ON CONFLICT (role_id, permission_id) DO NOTHING。主/测库均可重复执行。
-- ============================================================================

-- 1. 字典补缺（master-data read/write 总码）
INSERT INTO core_permissions (code, name, description, resource, action) VALUES
  ('master-data:read',  '主数据-读取', '主数据模块读取总码（§4 五环节 v1.97）', 'master-data', 'read'),
  ('master-data:write', '主数据-写入', '主数据模块写入总码（§4 五环节 v1.97）', 'master-data', 'write')
ON CONFLICT (code) DO NOTHING;

-- 2. 供应链 manager 绑定（scm_manager / wms_manager：物料主数据职责）
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM core_roles r
  CROSS JOIN core_permissions p
 WHERE (r.name = 'scm_manager' AND p.code IN ('master-data:read', 'master-data:write'))
    OR (r.name = 'wms_manager' AND p.code IN ('master-data:read', 'master-data:write'))
ON CONFLICT (role_id, permission_id) DO NOTHING;
