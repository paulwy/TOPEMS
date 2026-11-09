-- P3 / 2026-11-09：补建 BI 路由实际引用但库中缺失的两枚写码
--
-- 背景（生产 tenant_admin 复测定位）：
--   拆分 BI 读写细码后，routes.rs 的
--     comparison_write  → bi:comparison:write
--     visualization_write → bi:visualization:write
--   而 20261109101200 只补了「原本完全没有细码」的子域，漏建这两枚已有命名但库中
--   并不存在的写码 → POST /api/bi/comparison-analysis 报
--   「权限不足：需要 bi:comparison:write 权限」(403)，admin 同样被拦。
--   本迁移守卫式补建并按同域授予（不授平台码）。
--
-- 授予：
--   tenant_admin / admin / superadmin / bi_manager → 两枚写码
--   finance_manager 不授写（维持只读）
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp
--    USING public.core_roles r, public.core_permissions p
--    WHERE rp.role_id=r.id AND rp.permission_id=p.id
--      AND r.name IN ('tenant_admin','admin','superadmin','bi_manager')
--      AND p.code IN ('bi:comparison:write','bi:visualization:write');
--   DELETE FROM public.core_permissions p
--    WHERE p.code IN ('bi:comparison:write','bi:visualization:write')
--      AND NOT EXISTS (SELECT 1 FROM public.core_role_permissions rp WHERE rp.permission_id=p.id);

BEGIN;

INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (VALUES
  ('bi:comparison:write',    'BI 对比分析-写', 'BI 对比分析定义增删改与执行', 'bi', 'write'),
  ('bi:visualization:write', 'BI 可视化-写',   'BI 可视化创建、联动/下钻配置与导出', 'bi', 'write')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions p WHERE p.code = v.code);

-- 角色不存在时 natural join 自动跳过（守卫式）
INSERT INTO public.core_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.core_roles r
JOIN public.core_permissions p
  ON p.code IN ('bi:comparison:write','bi:visualization:write')
WHERE r.name IN ('tenant_admin','admin','superadmin','bi_manager')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
