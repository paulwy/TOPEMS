-- ============================================================
-- 审计整改批 5（P1 菜单对账）：MENU_ORPHAN_DB erp 全模块补种
-- 背景：core_menus(tenant 0001) 无任何 erp-% 菜单、core_menu_groups 无 erp_* 组
--       （前端 apps/web/src/modules/erp/config.ts navItems 24 项全缺 DB 种子）
-- 方式：1) 新建 6 个 erp_* 菜单组（tenant 0001，与 backfill JOIN 口径一致）
--       2) 24 项菜单种子（permission 取前端 navItem 真实细粒度权限码，非占位）
-- 幂等：ON CONFLICT (tenant_id, code) DO UPDATE，可重复执行。
-- ============================================================

-- 1) erp 菜单组（6 组：overview/process/business/analytics/master/settings）
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('ERP 概览',   'erp_overview',  'LayoutDashboard', 30),
    ('ERP 流程',   'erp_process',   'Workflow',        31),
    ('ERP 业务',   'erp_business',  'Briefcase',       32),
    ('ERP 主数据', 'erp_master',    'Database',        33),
    ('ERP 分析',   'erp_analytics', 'BarChart3',       34),
    ('ERP 设置',   'erp_settings',  'Settings2',       35)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- 2) erp 菜单种子（24 项，permission 取 navItem 真实权限码）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('ERP 仪表盘',    'erp-dashboard',            'LayoutDashboard',   1,  '/erp/dashboard',           'erp:dashboard:read',       'erp_overview'),
    ('采购订单',      'erp-purchase-order',       'ShoppingCart',      2,  '/erp/purchase-order',      'erp:purchase_order:read',  'erp_process'),
    ('销售订单',      'erp-sales-orders',         'FileText',          3,  '/erp/sales-orders',        'erp:sales_order:read',     'erp_process'),
    ('总账管理',      'erp-general-ledger',       'Wallet',            4,  '/erp/voucher-management', 'erp:general_ledger:read',  'erp_business'),
    ('应收应付',      'erp-receivable-payable',   'CreditCard',        5,  '/erp/receivable-payable', 'erp:receivable_payable:read', 'erp_business'),
    ('预算管理',      'erp-budget-management',    'Target',            6,  '/erp/budget-management',  'erp:budget:read',          'erp_business'),
    ('用车申请',      'erp-vehicle-request',      'ClipboardCheck',    7,  '/erp/vehicle-request',    'erp:vehicle_request:read', 'erp_business'),
    ('客户管理',      'erp-customer-management',  'Users',             8,  '/erp/customer-management','erp:customer:read',        'erp_master'),
    ('供应商管理',    'erp-supplier-management',  'Building2',         9,  '/erp/supplier-management','erp:supplier:read',        'erp_master'),
    ('库存管理',      'erp-inventory-management', 'Package',          10,  '/erp/inventory-management','erp:inventory:read',      'erp_master'),
    ('物料管理',      'erp-material-management',  'Layers',           11,  '/erp/material-management','erp:material:read',        'erp_master'),
    ('办公用品',      'erp-office-supplies',      'Package',          12,  '/erp/office-supplies',    'erp:office_supply:read',   'erp_master'),
    ('车辆管理',      'erp-vehicle-management',   'Car',              13,  '/erp/vehicle-management', 'erp:vehicle:read',         'erp_master'),
    ('资产管理',      'erp-asset-management',     'Landmark',         14,  '/erp/asset-management',   'erp:asset:read',           'erp_master'),
    ('银行账户',      'erp-bank-account',         'Building',         15,  '/erp/bank-account',       'erp:bank_account:read',    'erp_master'),
    ('会计科目',      'erp-accounting-management','FileSpreadsheet',  16,  '/erp/accounting-management','erp:accounting_subject:read','erp_master'),
    ('会议室管理',    'erp-meeting-room',         'Calendar',         17,  '/erp/meeting-room',       'erp:meeting_room:read',    'erp_master'),
    ('公告管理',      'erp-announcement',         'Bell',             18,  '/erp/announcement',       'erp:announcement:read',    'erp_master'),
    ('数据字典(业务)','erp-data-dictionaries',    'BookOpen',         19,  '/erp/data-dictionaries',  'erp:dashboard:read',       'erp_master'),
    ('财务报表',      'erp-financial-statements', 'FileSpreadsheet',  20,  '/erp/financial-report',   'erp:financial_statement:read', 'erp_analytics'),
    ('财务分析',      'erp-financial-analysis',   'BarChart3',        21,  '/erp/financial-analysis', 'erp:financial_analysis:read','erp_analytics'),
    ('数据字典',      'erp-dictionaries',         'BookOpen',         22,  '/erp/dict-management',    'erp:dictionary:read',      'erp_settings'),
    ('数据库管理',    'erp-database-management',  'Database',         23,  '/erp/database-management','erp:database:read',        'erp_settings'),
    ('审计日志',      'erp-audit-log',            'FileCheck',        24,  '/erp/audit-log',          'erp:audit:read',           'erp_settings')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;
