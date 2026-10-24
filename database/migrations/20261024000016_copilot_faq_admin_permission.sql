-- ============================================================================
-- 20261024000016_copilot_faq_admin_permission.sql
--
-- Copilot FAQ admin 端点的权限显式登记：ai:admin 字典兜底 + admin 角色绑定。
--
-- 背景（2026-10-24，迁移 20261024000015 配套）：
--   svc/ai GET/POST/PUT/DELETE /dsh/copilot/admin/faqs 经
--   has_ai_permission(Manage) → claims 需含伞码 `ai:admin`（超管短路豁免）。
--   该码在 public.core_permissions 已存在（20260908 前端同步种子，描述泛化为
--   "AI助手"），但无任何角色绑定——普通租户管理员拿不到该码，只有超管可用。
--   本迁移完成字典兜底 + admin 角色绑定，与 20261024000014_portal_admin_role_seed
--   同型三步模式。
--
-- 与 000014 的差异（重要）：本迁移全部显式写 public.* 副本。
--   登录 JWT 授权展开读 public 副本（svc/unified-core/src/modules/iam/auth.rs
--   :702-705 显式 JOIN public.core_roles / public.core_role_permissions /
--   public.core_permissions），unified-core IAM 角色管理同样读写 public.*；
--   iam.* 同名副本为历史孤儿（测试库 iam.core_permissions 无任何 ai:* 码）。
--   000014 未限定名随 search_path 落 iam 副本，运行时读不到——本迁移修正这一口径。
--
-- 幂等：字典 INSERT ON CONFLICT (code) DO NOTHING；角色 ON CONFLICT (name)
-- DO NOTHING；绑定 INSERT SELECT ... ON CONFLICT (role_id, permission_id)
-- DO NOTHING。主/测库及空库重建链均可重复执行。
-- ============================================================================

-- 1. 字典兜底：ai:admin（已存在则保留原描述不覆盖）
INSERT INTO public.core_permissions (code, name, description, resource, action) VALUES
  ('ai:admin', 'AI助手-管理',
   'AI 模块管理伞码；Copilot FAQ 知识库管理（core.ai_faqs admin CRUD：list/create/update/delete，迁移 20261024000015）',
   'ai', 'admin')
ON CONFLICT (code) DO NOTHING;

-- 2. admin 角色兜底（系统级 nil 租户，对齐 *_manager / 000014 角色约定）
INSERT INTO public.core_roles (name, description, tenant_id) VALUES
  ('admin', '系统管理员角色', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;

-- 3. 绑定 admin → ai:admin（幂等）
INSERT INTO public.core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.core_roles r
  CROSS JOIN public.core_permissions p
 WHERE r.name = 'admin'
   AND p.code = 'ai:admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
