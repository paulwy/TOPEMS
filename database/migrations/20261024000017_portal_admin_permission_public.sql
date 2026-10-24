-- ============================================================================
-- 20261024000017_portal_admin_permission_public.sql
--
-- 修正 000014 落 iam 副本的口径差异：portal:admin 在 public.* 显式登记并绑定 admin。
--
-- 背景（2026-10-24）：
--   上批 20261024000014_portal_admin_role_seed 完成了 portal:admin 字典兜底 +
--   admin 角色兜底 + admin → portal:admin 绑定，但全部使用未限定名
--   （INSERT INTO core_permissions / core_roles / core_role_permissions），
--   随应用 search_path=iam,mes,public,analytics 实际落到 iam.* 副本。
--   运行时权威源为 public 副本：unified-core 登录 JWT 授权展开显式 JOIN
--   public.core_roles / public.core_role_permissions / public.core_permissions
--   （svc/unified-core/src/modules/iam/auth.rs:702-705），unified-core IAM
--   角色管理同样读写 public.*；iam.* 同名副本为历史孤儿，运行时读不到。
--   000014 的 iam 副本绑定保留历史，不删改；本迁移在 public.* 同口径重新登记。
--
-- 与 20261024000016_copilot_faq_admin_permission 同型三步模式：
--   ① public.core_permissions 字典兜底（ON CONFLICT DO NOTHING，已存在不覆盖描述）
--   ② public.core_roles admin 角色兜底（系统级 nil 租户）
--   ③ public.core_role_permissions admin → portal:admin 绑定（幂等）
--
-- 勘察（topems_test，2026-10-24）：
--   · public.core_permissions 无 portal:admin 行（两副本均无，000014 未在此库应用）；
--   · public.core_roles 已有 admin 行（000016 手动应用时落地，id 已有值，
--     ON CONFLICT DO NOTHING 保证不重复插入）；
--   · public.core_role_permissions 当前仅有 admin → ai:admin 绑定。
--
-- 幂等：字典 INSERT ON CONFLICT (code) DO NOTHING；角色 ON CONFLICT (name)
-- DO NOTHING；绑定 INSERT SELECT ... ON CONFLICT (role_id, permission_id)
-- DO NOTHING。主/测库及空库重建链均可重复执行。
-- ============================================================================

-- 1. 字典兜底：portal:admin（已存在则保留原描述不覆盖）
INSERT INTO public.core_permissions (code, name, description, resource, action) VALUES
  ('portal:admin', '门户-管理',
   'portal 服务 require_permission 挂载的模块级管理伞码（20261020000024 字典补缺；20261024000014 iam 副本兜底；本迁移 public.* 显式登记）',
   'portal', 'admin')
ON CONFLICT (code) DO NOTHING;

-- 2. admin 角色兜底（系统级 nil 租户，对齐 *_manager / 000014 / 000016 角色约定）
INSERT INTO public.core_roles (name, description, tenant_id) VALUES
  ('admin', '系统管理员角色', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;

-- 3. 绑定 admin → portal:admin（幂等）
INSERT INTO public.core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.core_roles r
  CROSS JOIN public.core_permissions p
 WHERE r.name = 'admin'
   AND p.code = 'portal:admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
