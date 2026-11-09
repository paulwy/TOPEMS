-- P3 A 级止血（续）/ 2026-11-09：tenant_admin 授予 rd:formula:write
--
-- 背景：
--   rd 服务的写路由统一由模块伞码 rd:admin 守卫（rd/src/main.rs）。配方写路径
--   已改为细粒度码 rd:formula:write（该码在生产/本地字典中均已存在），但租户域
--   角色 tenant_admin 未持有它，会在 POST /api/rd/formulas 等入口 403。
--
-- 范围：只授租户域细码 rd:formula:write，不授平台码、不授模块伞码 rd:admin。
--
-- Idempotency：NOT EXISTS(role_id, permission_id)。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_roles r, public.core_permissions p
--    WHERE rp.role_id = r.id AND rp.permission_id = p.id
--      AND r.name = 'tenant_admin' AND p.code = 'rd:formula:write';

BEGIN;

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'rd:formula:write'
WHERE r.name = 'tenant_admin'
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

COMMIT;
