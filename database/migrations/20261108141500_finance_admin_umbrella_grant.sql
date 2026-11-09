-- 财务管理员伞码 finance:admin 补齐与租户域授权（2026-11-09）
--
-- 背景：`finance:admin` 是财务写请求网关门（svc/server/src/modules/finance_real_module.rs
-- `require_finance_write`）与审批配置 5 个 handler 的独立权限点。历史迁移
-- `20261107000024_finance_admin_seed.sql` 早于生产账本锚点且从未登记进生产账本
-- （apply-forward 只应用 version > anchor 的迁移），导致生产 `core_permissions`
-- 缺失该码、0 角色授权：所有非超管的财务 POST/PUT/PATCH/DELETE 一律 403。
--
-- 本迁移只做两件事（只增不减，幂等可重跑）：
--   1) 补建 `finance:admin` 权限行（若不存在）；
--   2) 授予 `tenant_admin`（租户域角色）与 `finance_manager`（若角色存在且未绑定）。
--      不新增、不授予任何平台层权限码（tenant:* / iam:* / system:* 等）。
--
-- 幂等：建码用 NOT EXISTS(code)；授权用 NOT EXISTS(role_id, permission_id)。
-- 重复执行为 no-op。
--
-- 回退（撤销授权 + 删码）：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id AND p.code = 'finance:admin'
--      AND rp.role_id IN (SELECT id FROM public.core_roles
--                          WHERE name IN ('tenant_admin','finance_manager'));
--   DELETE FROM public.core_permissions WHERE code = 'finance:admin';
--   -- 权限缓存最长 60s（PERMISSION_CACHE_TTL_SECS），回退后如需立即生效请重启服务。

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:admin', '财务管理-管理员', 'finance', 'admin', 1
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions WHERE code = 'finance:admin'
);

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'finance:admin'
WHERE r.name IN ('tenant_admin', 'finance_manager')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
