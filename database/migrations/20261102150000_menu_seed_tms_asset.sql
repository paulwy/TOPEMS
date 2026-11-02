-- ============================================================
-- 审计整改批 5（P1 菜单对账）：MENU_ORPHAN_FE tms/asset 补种
-- 背景：tms/asset 模块前端 navItem 无 core_menus(tenant 0001) 种子（模块级整缺）
-- 方式：1) 建模块菜单组（tms 4 组 / asset 5 组，tenant 0001）
--       2) navItem 逐项补种（permission 取前端 navItem 真实细粒度权限码）
-- 幂等：ON CONFLICT (tenant_id, code) DO UPDATE，可重复执行。
-- ============================================================

-- 1) tms 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('运输概览', 'tms_overview',  'LayoutDashboard', 40),
    ('运输主数据', 'tms_master',  'Database',        41),
    ('运输业务', 'tms_business',  'Truck',           42),
    ('运输分析', 'tms_analytics', 'BarChart3',       43)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- 2) tms 菜单种子（12 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('运输仪表盘',   'tms-dashboard',           'LayoutDashboard',  1, '/tms/dashboard',             'tms:dashboard:read', 'tms_overview'),
    ('车辆管理',     'tms-vehicles',            'Truck',            2, '/tms/vehicles',              'tms:vehicle:read',   'tms_master'),
    ('司机管理',     'tms-drivers',             'Users',            3, '/tms/drivers',               'tms:driver:read',    'tms_master'),
    ('承运商管理',   'tms-carriers',            'Building',         4, '/tms/carriers',              'tms:carrier:read',   'tms_master'),
    ('路线管理',     'tms-routes',              'Route',            5, '/tms/routes',                'tms:route:read',     'tms_master'),
    ('运单管理',     'tms-shipments',           'Package',          6, '/tms/shipments',             'tms:shipment:read',  'tms_business'),
    ('运量趋势',     'tms-shipment-trend',      'TrendingUp',       7, '/tms/analytics/shipment-trend',      'tms:analytics:read', 'tms_analytics'),
    ('车辆利用率',   'tms-vehicle-utilization', 'Gauge',            8, '/tms/analytics/vehicle-utilization', 'tms:analytics:read', 'tms_analytics'),
    ('司机绩效',     'tms-driver-performance',  'UserCheck',        9, '/tms/analytics/driver-performance',  'tms:analytics:read', 'tms_analytics'),
    ('承运商绩效',   'tms-carrier-performance', 'Building2',       10, '/tms/analytics/carrier-performance', 'tms:analytics:read', 'tms_analytics'),
    ('路线效率',     'tms-route-efficiency',    'Map',             11, '/tms/analytics/route-efficiency',    'tms:analytics:read', 'tms_analytics'),
    ('运费成本',     'tms-freight-cost',        'DollarSign',      12, '/tms/analytics/freight-cost',        'tms:analytics:read', 'tms_analytics')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- 3) asset 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('资产概览', 'asset_overview',  'LayoutDashboard', 50),
    ('资产业务', 'asset_business',  'Briefcase',       51),
    ('资产主数据', 'asset_master',  'Database',        52),
    ('资产分析', 'asset_analytics', 'BarChart3',       53),
    ('资产流程', 'asset_process',   'Workflow',        54)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- 4) asset 菜单种子（5 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('资产仪表盘', 'asset-dashboard',   'LayoutDashboard', 1, '/asset/dashboard',   'asset:dashboard:read',   'asset_overview'),
    ('资产台账',   'asset-list',        'FileText',        2, '/asset/list',        'asset:list:read',        'asset_business'),
    ('资产分类',   'asset-categories',  'Tags',            3, '/asset/categories',  'asset:category:read',    'asset_master'),
    ('折旧分析',   'asset-depreciation','TrendingDown',    4, '/asset/depreciation','asset:depreciation:read','asset_analytics'),
    ('资产调拨',   'asset-transfers',   'ArrowRightLeft',  5, '/asset/transfers',   'asset:transfer:read',    'asset_process')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;
