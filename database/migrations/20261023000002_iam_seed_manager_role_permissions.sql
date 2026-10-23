-- ============================================================================
-- 20261023000002_iam_seed_manager_role_permissions.sql
--
-- §4 权限体系联动（v1.91/1.93 收尾）：manager 角色细粒度授权种子。
--
-- 背景：v1.91 模块级放行后，业务角色可用性依赖「角色→细粒度权限码」绑定。
-- 此前在 test 库手工 INSERT 的角色/权限绑定（erp_manager、scm:write/wms:write
-- 总码、交叉绑定）未落迁移，主库同缺；本迁移将其幂等落地。
--
-- 内容：
--   1. 字典补缺：`<mod>:read/write` 总码（若缺）；
--   2. erp_manager 角色（系统级 nil 租户，对齐 qms/scm/wms manager 约定）；
--      并修正手工建库时的 001 租户版（统一为 nil，幂等）；
--   3. 四 manager 角色绑定 read/write 总码（业务模块写操作链路：如
--      scm:write / wms:write 供 handler 级 check_permission 使用）；
--   4. 清理 v1.91 手工交叉绑定副作用（scm_manager 的 wms:*、
--      wms_manager 的 scm:*）。
--
-- 幂等保证：字典/角色 INSERT 均 ON CONFLICT DO NOTHING；角色绑定 INSERT
-- ON CONFLICT (role_id, permission_id) DO NOTHING；UPDATE/DELETE 均为
-- 条件式。主/测库、存量/空库均可重复执行。
-- ============================================================================

-- 1. 字典补缺（read/write 总码，与 iam/mod.rs 注册表一致）
INSERT INTO core_permissions (code, name, description, resource, action) VALUES
  ('erp:read',  '企业管理-读取', 'ERP 模块读取总码（§4 权限体系 v1.91）', 'erp', 'read'),
  ('erp:write', '企业管理-写入', 'ERP 模块写入总码（§4 权限体系 v1.91）', 'erp', 'write'),
  ('scm:read',  '供应链-读取',   'SCM 模块读取总码（§4 权限体系 v1.91）', 'scm', 'read'),
  ('scm:write', '供应链-写入',   'SCM 模块写入总码（§4 权限体系 v1.91）', 'scm', 'write'),
  ('wms:read',  '仓储管理-读取', 'WMS 模块读取总码（§4 权限体系 v1.91）', 'wms', 'read'),
  ('wms:write', '仓储管理-写入', 'WMS 模块写入总码（§4 权限体系 v1.91）', 'wms', 'write'),
  ('qms:read',  '质量管理-读取', 'QMS 模块读取总码（§4 权限体系 v1.91）', 'qms', 'read'),
  ('qms:write', '质量管理-写入', 'QMS 模块写入总码（§4 权限体系 v1.91）', 'qms', 'write')
ON CONFLICT (code) DO NOTHING;

-- 2. erp_manager 角色（系统级 nil 租户，对齐 qms/scm/wms manager 约定）
INSERT INTO core_roles (name, description, tenant_id) VALUES
  ('erp_manager', '企业管理角色', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;

-- 2b. 修正手工建库的 001 租户版 erp_manager → 系统级 nil（幂等）
UPDATE core_roles
   SET tenant_id = '00000000-0000-0000-0000-000000000000',
       updated_at = now()
 WHERE name = 'erp_manager'
   AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- 3. manager 角色绑定 read/write 总码（幂等）
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM core_roles r
  CROSS JOIN core_permissions p
 WHERE (r.name = 'erp_manager' AND p.code IN ('erp:read', 'erp:write'))
    OR (r.name = 'scm_manager' AND p.code IN ('scm:read', 'scm:write'))
    OR (r.name = 'wms_manager' AND p.code IN ('wms:read', 'wms:write'))
    OR (r.name = 'qms_manager' AND p.code IN ('qms:read', 'qms:write'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. 清理 v1.91 手工交叉绑定副作用（scm_manager 的 wms:*、wms_manager 的 scm:*）
DELETE FROM core_role_permissions rp
 USING core_roles r, core_permissions p
 WHERE rp.role_id = r.id
   AND rp.permission_id = p.id
   AND ((r.name = 'scm_manager' AND p.code LIKE 'wms:%')
     OR (r.name = 'wms_manager' AND p.code LIKE 'scm:%'));
