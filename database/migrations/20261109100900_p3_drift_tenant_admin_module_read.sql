-- P3 A 级止血（续）/ 2026-11-09：tenant_admin 补授模块级只读码
--
-- 背景：
--   master-data / rd 的受保护路由入口有 require_module_access("<module>") 模块门
--   （命中任一 "<module>:*" 码即放行）。生产 tenant_admin 已持有全量模块码，但本地/
--   部分环境存在角色-权限映射缺口，导致真实 tenant_admin 在进入供应商、部署、配方
--   页面时先被模块门 403，根本走不到业务代码。
--
-- 范围（只补租户域只读码，不授任何平台码、不授模块伞码 admin）：
--   master-data:read、rd:read → 授予 tenant_admin。
--
-- Idempotency：建码 NOT EXISTS(code)；授权 NOT EXISTS(role_id, permission_id)。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_roles r, public.core_permissions p
--    WHERE rp.role_id = r.id AND rp.permission_id = p.id
--      AND r.name = 'tenant_admin' AND p.code IN ('master-data:read','rd:read');
--   （若确认码无其他持有者且需删码）：
--   DELETE FROM public.core_permissions WHERE code IN ('master-data:read','rd:read');

BEGIN;

-- 1) 确保模块只读码存在（本地缺 rd:read；生产已在，守卫后 no-op）
INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (VALUES
    ('master-data:read', '主数据-只读', 'master-data 模块只读入口', 'master-data', 'read'),
    ('rd:read',          '研发-只读',   'rd 模块只读入口',       'rd',          'read')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

-- 2) 授予 tenant_admin（租户域角色）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN ('master-data:read', 'rd:read')
WHERE r.name = 'tenant_admin'
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

COMMIT;
