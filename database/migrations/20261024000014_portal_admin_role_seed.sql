-- ============================================================================
-- 20261024000014_portal_admin_role_seed.sql
--
-- 平台域补漏：portal:admin 权限码绑定 admin 角色。
--
-- 背景：
--   portal 服务 require_permission 挂载模块级管理伞码 portal:admin；
--   20261020000024 已把该码补进 core_permissions 字典（ON CONFLICT DO NOTHING），
--   但刻意未做角色绑定（授权变更留待统一决策）。本迁移完成该绑定：
--   admin 角色 ← portal:admin。
--
-- 勘察（2026-10-24，topems_test，只读）：
--   · 绑定表 iam.core_role_permissions(role_id, permission_id)，
--     PK = (role_id, permission_id) → ON CONFLICT (role_id, permission_id) 可用；
--   · iam.core_roles 无 code 列（列：id/name/description/tenant_id/时间戳/deleted_at），
--     且有 UNIQUE(name)（core_roles_name_key）→ 按 name='admin' 匹配；
--   · topems_test 当前 core_roles 仅有 *_manager 系列系统角色，无 admin 行；
--     core_permissions 亦无 portal:admin 行（该库 _sqlx_migrations 账本仅到
--     20260827000001，20261020000024 未在此库登记）。
--   因此本迁移按 20261023000002 manager 种子同型模式自举：
--     先兜底补字典行 → 兜底建 admin 角色（系统级 nil 租户）→ 再绑定。
--   空库重建链与存量库均可重复执行（全部 ON CONFLICT DO NOTHING）。
--
-- 幂等：字典/角色 INSERT ON CONFLICT (code|name) DO NOTHING；
--       绑定 INSERT SELECT ... ON CONFLICT (role_id, permission_id) DO NOTHING。
-- ============================================================================

-- 1. 字典兜底：portal:admin（20261020000024 已登记同值；此处保证空库/漏跑时也存在）
INSERT INTO core_permissions (code, name, description, resource, action) VALUES
  ('portal:admin', '门户-管理', 'portal 服务 require_permission 挂载的模块级管理伞码（20261020000024 字典补缺；本迁移兜底）', 'portal', 'admin')
ON CONFLICT (code) DO NOTHING;

-- 2. admin 角色兜底（系统级 nil 租户，对齐 *_manager 角色约定）
INSERT INTO core_roles (name, description, tenant_id) VALUES
  ('admin', '系统管理员角色', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;

-- 3. 绑定 admin → portal:admin（幂等）
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM core_roles r
  CROSS JOIN core_permissions p
 WHERE r.name = 'admin'
   AND p.code = 'portal:admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
