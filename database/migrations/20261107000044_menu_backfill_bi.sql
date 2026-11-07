-- W1-1a：补齐 bi 模块 12 条前端已定义、生产库缺失的菜单
-- 依据：docs/quality/menu-correspondence-audit-2026-11-07.md §5.3
--       apps/web/src/modules/bi/config.ts navItems
-- 幂等：组 / 菜单均按 (tenant_id, code) ON CONFLICT DO UPDATE，重复执行 0 新增
-- 租户：默认租户 00000000-0000-0000-0000-000000000001（与生产 public.core_menus 一致）
--
-- 回滚（按唯一键 tenant_id + code，仅删除本迁移写入的行）：
--   DELETE FROM core_menus
--    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
--      AND code IN ('bi-dashboard','bi-analytics','bi-comparison','bi-data-source',
--                   'bi-dataset','bi-report','bi-visualization','bi-report-builder',
--                   'bi-permission','bi-index','bi-gis','bi-data-analysis');
--   DELETE FROM core_menu_groups
--    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
--      AND code IN ('bi_overview','bi_analytics','bi_business');

-- bi 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('BI 概览', 'bi_overview', 'FileText', 170),
    ('BI 分析', 'bi_analytics', 'FileText', 171),
    ('BI 设置', 'bi_business', 'FileText', 172)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE
  SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- bi 菜单种子（12 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id,
       v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('分析概览',   'bi-dashboard',      'LayoutDashboard', 0, '/bi/dashboard',      'bi:dashboard:read',    'bi_overview'),
    ('数据分析',   'bi-analytics',      'TrendingUp',      1, '/bi/analytics',      'bi:analytics:read',    'bi_analytics'),
    ('对比分析',   'bi-comparison',     'GitCompare',      2, '/bi/comparison',     'bi:comparison:read',   'bi_analytics'),
    ('数据源',     'bi-data-source',    'Database',        1, '/bi/data-source',    'bi:data_source:read',  'bi_business'),
    ('数据集',     'bi-dataset',        'Table',           2, '/bi/dataset',        'bi:dataset:read',      'bi_business'),
    ('报表中心',   'bi-report',         'FileSpreadsheet', 3, '/bi/report',         'bi:report:read',       'bi_analytics'),
    ('可视化',     'bi-visualization',  'PieChart',        4, '/bi/visualization',  'bi:visualization:read','bi_analytics'),
    ('报表设计器', 'bi-report-builder', 'Wand2',           5, '/bi/report-builder', 'bi:report:write',      'bi_analytics'),
    ('权限管理',   'bi-permission',     'Lock',            3, '/bi/permission',     'bi:dashboard:admin',   'bi_business'),
    ('指标管理',   'bi-index',          'Target',          4, '/bi/index',          'bi:index:read',        'bi_business'),
    ('空间分析',   'bi-gis',            'Map',             6, '/bi/gis',            'bi:gis:read',          'bi_analytics'),
    ('销售分析',   'bi-data-analysis',  'LineChart',       7, '/bi/data-analysis',  'bi:analytics:read',    'bi_analytics')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g
  ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET name = EXCLUDED.name,
      group_id = EXCLUDED.group_id,
      path = EXCLUDED.path,
      icon = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order,
      status = EXCLUDED.status,
      permissions = EXCLUDED.permissions,
      updated_at = now();
