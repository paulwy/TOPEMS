-- P3 收尾：法定报表三页挂载到财务域菜单
-- 依据：apps/web/src/module-configs/finance/config.ts navItems
--       GET  /api/finance/reports/account-balance
--       POST /api/finance/reports/balance-sheet/generate
--       POST /api/finance/reports/income-statement/generate
--
-- 权限：沿用既有 finance:report:read，不新增伞码。
-- 幂等：组 / 菜单均按 (tenant_id, code) ON CONFLICT DO UPDATE，重复执行 0 新增。
-- 租户：默认租户 00000000-0000-0000-0000-000000000001（与生产 public.core_menus 一致）。
--
-- 回滚（仅删除本迁移写入的行）：
--   DELETE FROM public.core_menus
--    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
--      AND code IN ('finance-account-balance-report',
--                   'finance-balance-sheet-report',
--                   'finance-income-statement-report');

INSERT INTO public.core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('财务管理分析', 'finance_analytics', 'BarChart3', 9)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO public.core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id,
       v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('科目余额表', 'finance-account-balance-report',  'Table',           4, '/finance/account-balance',  'finance:report:read', 'finance_analytics'),
    ('资产负债表', 'finance-balance-sheet-report',    'FileSpreadsheet', 5, '/finance/balance-sheet',    'finance:report:read', 'finance_analytics'),
    ('利润表',     'finance-income-statement-report', 'TrendingUp',      6, '/finance/income-statement', 'finance:report:read', 'finance_analytics')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN public.core_menu_groups g
  ON g.code = v.group_code
 AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET name = EXCLUDED.name,
      group_id = EXCLUDED.group_id,
      path = EXCLUDED.path,
      icon = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order,
      status = EXCLUDED.status,
      permissions = EXCLUDED.permissions,
      updated_at = now();
