-- ============================================================
-- 财务管理 (finance) Menu Groups & Items
-- ============================================================

-- Menu groups for 财务管理
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('finance_analytics', '财务管理分析', 'BarChart3', 9),
    ('finance_business', '财务管理业务', 'Briefcase', 7),
    ('finance_overview', '财务管理概览', 'LayoutDashboard', 6),
    ('finance_process', '财务管理流程', 'GitBranch', 8)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 财务管理
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('finance-reports', '财务报表', 'FileSpreadsheet', 1, '/finance/reports', 'finance:report:read', 'finance_analytics'),
    ('finance-opening-balance', '期初余额', 'CircleDot', 2, '/finance/opening-balance', 'finance:opening_balance:read', 'finance_analytics'),
    ('finance-consolidation', '合并报表', 'Layers', 3, '/finance/consolidation', 'finance:consolidation:read', 'finance_analytics'),
    ('finance-vouchers', '凭证管理', 'FileText', 1, '/finance/vouchers', 'finance:voucher:read', 'finance_business'),
    ('finance-ledger', '总账管理', 'FileSpreadsheet', 2, '/finance/ledger', 'finance:ledger:read', 'finance_business'),
    ('finance-receivable-payable', '应收应付', 'TrendingUp', 3, '/finance/receivable-payable', 'finance:receivable:read', 'finance_business'),
    ('finance-receipts', '收款管理', 'ArrowDownCircle', 4, '/finance/receipts', 'finance:receipt:read', 'finance_business'),
    ('finance-payments', '付款管理', 'ArrowUpCircle', 5, '/finance/payments', 'finance:payment:read', 'finance_business'),
    ('finance-approval-config', '审批配置', 'Settings', 6, '/finance/approval-config', 'finance:approval_config:read', 'finance_business'),
    ('finance-invoices', '发票管理', 'FileText', 7, '/finance/invoices', 'finance:invoice:read', 'finance_business'),
    ('finance-expense', '费用管理', 'CreditCard', 8, '/finance/expense', 'finance:expense:read', 'finance_business'),
    ('finance-expense-approval', '费用审批', 'ClipboardList', 9, '/finance/expense-approval', 'finance:expense_approval:read', 'finance_business'),
    ('finance-dashboard', '仪表盘', 'LayoutDashboard', 0, '/finance/dashboard', 'finance:read', 'finance_overview'),
    ('finance-budget', '预算管理', 'PieChart', 1, '/finance/budget', 'finance:budget:read', 'finance_process'),
    ('finance-assets', '资产管理', 'Briefcase', 2, '/finance/assets', 'finance:asset:read', 'finance_process'),
    ('finance-tax', '税务管理', 'FileCheck', 3, '/finance/tax', 'finance:tax:read', 'finance_process'),
    ('finance-cost', '成本管理', 'BarChart3', 4, '/finance/cost', 'finance:cost:read', 'finance_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 生产执行 (mes) Menu Groups & Items
-- ============================================================

-- Menu groups for 生产执行
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('mes_analytics', '生产执行分析', 'BarChart3', 11),
    ('mes_business', '生产执行业务', 'Briefcase', 9),
    ('mes_overview', '生产执行概览', 'LayoutDashboard', 8),
    ('mes_process', '生产执行流程', 'GitBranch', 10)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 生产执行
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('mes-production-kanban', '生产看板', 'LayoutGrid', 1, '/mes/production-kanban', 'mes:kanban:read', 'mes_analytics'),
    ('mes-production-record', '生产记录', 'ScrollText', 2, '/mes/production-record', 'mes:production_record:read', 'mes_analytics'),
    ('mes-work-report', '工作报告', 'FileCheck', 3, '/mes/work-report', 'mes:work_report:read', 'mes_analytics'),
    ('mes-equipment-oee', '设备OEE', 'Gauge', 4, '/mes/equipment-oee', 'mes:oee:read', 'mes_analytics'),
    ('mes-production-dashboard', '生产总览', 'BarChart3', 5, '/mes/production-dashboard', 'mes:read', 'mes_analytics'),
    ('mes-production-cost', '生产成本核算', 'DollarSign', 6, '/mes/production-cost', 'mes:read', 'mes_analytics'),
    ('mes-energy-management', '能耗管理', 'Zap', 7, '/mes/energy-management', 'mes:read', 'mes_analytics'),
    ('mes-anomaly-detection', '异常预警', 'AlertTriangle', 8, '/mes/anomaly-detection', 'mes:read', 'mes_analytics'),
    ('mes-production-orders', '生产订单', 'ClipboardList', 1, '/mes/production-orders', 'mes:production_order:read', 'mes_business'),
    ('mes-work-orders', '工单管理', 'FileText', 2, '/mes/work-orders', 'mes:work_order:read', 'mes_business'),
    ('mes-equipment', '设备管理', 'Wrench', 3, '/mes/equipment', 'mes:equipment:read', 'mes_business'),
    ('mes-work-stations', '工位管理', 'MapPin', 4, '/mes/work-stations', 'mes:work_station:read', 'mes_business'),
    ('mes-teams', '班组管理', 'Users', 5, '/mes/teams', 'mes:team:read', 'mes_business'),
    ('mes-material-requirement', '物料需求', 'Package', 6, '/mes/material-requirement', 'mes:material:read', 'mes_business'),
    ('mes-work-order', '工单管理(新)', 'ClipboardList', 7, '/mes/work-order', 'mes:work_order:read', 'mes_business'),
    ('mes-quality', '质量管理', 'CheckCircle', 8, '/mes/quality', 'mes:quality:read', 'mes_business'),
    ('mes-dashboard', '仪表盘', 'LayoutDashboard', 0, '/mes/dashboard', 'mes:read', 'mes_overview'),
    ('mes-process-routes', '工艺路线', 'Route', 1, '/mes/process-routes', 'mes:process_route:read', 'mes_process'),
    ('mes-process-flow', '工艺流程', 'GitBranch', 2, '/mes/process-flow', 'mes:process_flow:read', 'mes_process'),
    ('mes-production-process', '生产过程', 'Activity', 3, '/mes/production-process', 'mes:production_process:read', 'mes_process'),
    ('mes-production-schedule', '生产计划', 'Calendar', 4, '/mes/production-schedule', 'mes:production_schedule:read', 'mes_process'),
    ('mes-wip', '在制品', 'Box', 5, '/mes/wip', 'mes:wip:read', 'mes_process'),
    ('mes-quality-inspection', '过程质检', 'CheckCircle', 6, '/mes/quality-inspection', 'mes:quality:read', 'mes_process'),
    ('mes-traceability', '质量追溯', 'Search', 7, '/mes/traceability', 'mes:traceability:read', 'mes_process'),
    ('mes-aps-scheduling', 'APS高级排程', 'Brain', 8, '/mes/aps-scheduling', 'mes:production_schedule:read', 'mes_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 人力资源 (hrm) Menu Groups & Items
-- ============================================================

-- Menu groups for 人力资源
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('hrm_analytics', '人力资源分析', 'BarChart3', 8),
    ('hrm_business', '人力资源业务', 'Briefcase', 6),
    ('hrm_overview', '人力资源概览', 'LayoutDashboard', 5),
    ('hrm_process', '人力资源流程', 'GitBranch', 7)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 人力资源
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('hrm-reports', '统计报表', 'BarChart3', 1, '/hrm/reports', 'hrm:report:read', 'hrm_analytics'),
    ('hrm-overview', '数据概览', 'PieChart', 2, '/hrm/overview', 'hrm:read', 'hrm_analytics'),
    ('hrm-employees', '员工管理', 'User', 1, '/hrm/employees', 'hrm:employee:read', 'hrm_business'),
    ('hrm-departments', '部门管理', 'Network', 2, '/hrm/departments', 'hrm:department:read', 'hrm_business'),
    ('hrm-organization', '组织架构', 'Building2', 3, '/hrm/organization', 'hrm:organization:read', 'hrm_business'),
    ('hrm-positions', '岗位管理', 'Briefcase', 4, '/hrm/positions', 'hrm:position:read', 'hrm_business'),
    ('hrm-contracts', '合同管理', 'FileText', 5, '/hrm/contracts', 'hrm:contract:read', 'hrm_business'),
    ('hrm-company', '公司信息', 'Building', 6, '/hrm/company', 'hrm:company:read', 'hrm_business'),
    ('hrm-dashboard', '仪表盘', 'LayoutDashboard', 0, '/hrm/dashboard', 'hrm:read', 'hrm_overview'),
    ('hrm-attendance', '考勤管理', 'Clock', 1, '/hrm/attendance', 'hrm:attendance:read', 'hrm_process'),
    ('hrm-leave', '请假管理', 'Calendar', 2, '/hrm/leave', 'hrm:leave:read', 'hrm_process'),
    ('hrm-payroll', '薪资管理', 'Wallet', 3, '/hrm/payroll', 'hrm:payroll:read', 'hrm_process'),
    ('hrm-salary-adjustment', '调薪管理', 'TrendingUp', 4, '/hrm/salary-adjustment', 'hrm:salary_adjustment:read', 'hrm_process'),
    ('hrm-recruitment', '招聘管理', 'UserPlus', 5, '/hrm/recruitment', 'hrm:recruitment:read', 'hrm_process'),
    ('hrm-training', '培训管理', 'GraduationCap', 6, '/hrm/training', 'hrm:training:read', 'hrm_process'),
    ('hrm-performance', '绩效管理', 'Trophy', 7, '/hrm/performance', 'hrm:performance:read', 'hrm_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 产品数据 (pdm) Menu Groups & Items
-- ============================================================

-- Menu groups for 产品数据
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('pdm_analytics', '产品数据分析', 'BarChart3', 16),
    ('pdm_business', '产品数据业务', 'Briefcase', 14),
    ('pdm_overview', '产品数据概览', 'LayoutDashboard', 13),
    ('pdm_process', '产品数据流程', 'GitBranch', 15)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 产品数据
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('pdm-stats', '统计分析', 'BarChart3', 1, '/pdm/stats', 'pdm:stats:read', 'pdm_analytics'),
    ('pdm-product', '产品管理', 'Box', 1, '/pdm/product', 'pdm:product:read', 'pdm_business'),
    ('pdm-material', '物料管理', 'Layers', 2, '/pdm/material', 'pdm:material:read', 'pdm_business'),
    ('pdm-bom', 'BOM管理', 'GitBranch', 3, '/pdm/bom', 'pdm:bom:read', 'pdm_business'),
    ('pdm-pdm-bom', 'PDM BOM', 'Network', 4, '/pdm/pdm-bom', 'pdm:bom:read', 'pdm_business'),
    ('pdm-document', '文档管理', 'FileText', 5, '/pdm/document', 'pdm:document:read', 'pdm_business'),
    ('pdm-project', '项目管理', 'FolderKanban', 6, '/pdm/project', 'pdm:project:read', 'pdm_business'),
    ('pdm-product-config', '产品配置', 'Settings2', 7, '/pdm/product-config', 'pdm:product:read', 'pdm_business'),
    ('pdm-formula', '配方管理', 'FlaskConical', 8, '/pdm/formula', 'pdm:formula:read', 'pdm_business'),
    ('pdm-process', '工艺管理', 'Activity', 9, '/pdm/process', 'pdm:process:read', 'pdm_business'),
    ('pdm-batch', '批次管理', 'Hash', 10, '/pdm/batch', 'pdm:batch:read', 'pdm_business'),
    ('pdm-step', '步骤管理', 'CircleDot', 11, '/pdm/step', 'pdm:step:read', 'pdm_business'),
    ('pdm-product-category', '产品类别', 'Tags', 12, '/pdm/product-category', 'pdm:product_category:read', 'pdm_business'),
    ('pdm-dashboard', '仪表盘', 'LayoutDashboard', 0, '/pdm/dashboard', 'pdm:read', 'pdm_overview'),
    ('pdm-version', '版本管理', 'Tag', 1, '/pdm/version', 'pdm:version:read', 'pdm_process'),
    ('pdm-change', '变更管理', 'RefreshCw', 2, '/pdm/change', 'pdm:change:read', 'pdm_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 仓储管理 (wms) Menu Groups & Items
-- ============================================================

-- Menu groups for 仓储管理
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('wms_analytics', '仓储管理分析', 'BarChart3', 15),
    ('wms_business', '仓储管理业务', 'Briefcase', 13),
    ('wms_overview', '仓储管理概览', 'LayoutDashboard', 12),
    ('wms_process', '仓储管理流程', 'GitBranch', 14)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 仓储管理
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('wms-items', '库存查询', 'Package', 1, '/wms/inventory', 'wms:inventory:read', 'wms_analytics'),
    ('wms-inventory-report', '库存报表', 'BarChart3', 2, '/wms/inventory-report', 'wms:report:read', 'wms_analytics'),
    ('wms-warehouses', '仓库管理', 'Warehouse', 1, '/wms/warehouse-management', 'wms:warehouse:read', 'wms_business'),
    ('wms-locations', '库位管理', 'MapPin', 2, '/wms/location-management', 'wms:location:read', 'wms_business'),
    ('wms-batches', '批次管理', 'Layers', 3, '/wms/batch-management', 'wms:batch:read', 'wms_business'),
    ('wms-serial-number', '序列号管理', 'Hash', 4, '/wms/serial-number', 'wms:serial_number:read', 'wms_business'),
    ('wms-supplier-management', '供应商管理', 'Building2', 5, '/wms/supplier-management', 'wms:supplier:read', 'wms_business'),
    ('wms-area', '库区管理', 'Map', 6, '/wms/area', 'wms:area:read', 'wms_business'),
    ('wms-dashboard', '仪表盘', 'LayoutDashboard', 0, '/wms/dashboard', 'wms:read', 'wms_overview'),
    ('wms-inbound', '入库管理', 'ArrowDownToLine', 1, '/wms/inbound', 'wms:inbound:read', 'wms_process'),
    ('wms-inbound-order', '入库单', 'FileText', 2, '/wms/inbound-order', 'wms:inbound:read', 'wms_process'),
    ('wms-outbound', '出库管理', 'ArrowUpFromLine', 3, '/wms/outbound', 'wms:outbound:read', 'wms_process'),
    ('wms-outbound-order', '出库单', 'FileText', 4, '/wms/outbound-order', 'wms:outbound:read', 'wms_process'),
    ('wms-transfer', '调拨管理', 'ArrowRightLeft', 5, '/wms/transfer', 'wms:transfer:read', 'wms_process'),
    ('wms-inventory-check', '库存盘点', 'ClipboardCheck', 6, '/wms/stock-take', 'wms:inventory_check:read', 'wms_process'),
    ('wms-replenishment', '补货管理', 'RefreshCw', 7, '/wms/replenishment', 'wms:replenishment:read', 'wms_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 安全环保 (ehs) Menu Groups & Items
-- ============================================================

-- Menu groups for 安全环保
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('ehs_analytics', '安全环保分析', 'BarChart3', 13),
    ('ehs_business', '安全环保业务', 'Briefcase', 11),
    ('ehs_overview', '安全环保概览', 'LayoutDashboard', 10),
    ('ehs_process', '安全环保流程', 'GitBranch', 12)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 安全环保
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('ehs-environment', '环境监测', 'Leaf', 1, '/ehs/environment', 'ehs:environment:read', 'ehs_analytics'),
    ('ehs-check', '安全检查', 'ClipboardCheck', 1, '/ehs/check', 'ehs:check:read', 'ehs_business'),
    ('ehs-hazard', '危险源管理', 'AlertTriangle', 2, '/ehs/hazard', 'ehs:hazard:read', 'ehs_business'),
    ('ehs-accident', '事故管理', 'AlertCircle', 3, '/ehs/accident', 'ehs:accident:read', 'ehs_business'),
    ('ehs-compliance', '合规管理', 'FileCheck', 4, '/ehs/compliance', 'ehs:compliance:read', 'ehs_business'),
    ('ehs-occupational-disease', '职业病管理', 'Heart', 5, '/ehs/occupational-disease', 'ehs:occupational_disease:read', 'ehs_business'),
    ('ehs-health-management', '健康管理', 'Activity', 6, '/ehs/health-management', 'ehs:health:read', 'ehs_business'),
    ('ehs-hazardous-material', '危化品管理', 'FlaskConical', 7, '/ehs/hazardous-material', 'ehs:hazardous_material:read', 'ehs_business'),
    ('ehs-emergency', '应急管理', 'Zap', 8, '/ehs/emergency', 'ehs:emergency:read', 'ehs_business'),
    ('ehs-incident-report', '事件报告', 'FileText', 9, '/ehs/incident-report', 'ehs:incident:read', 'ehs_business'),
    ('ehs-dashboard', '仪表盘', 'LayoutDashboard', 0, '/ehs/dashboard', 'ehs:read', 'ehs_overview'),
    ('ehs-plan', '工作计划', 'Calendar', 1, '/ehs/plan', 'ehs:plan:read', 'ehs_process'),
    ('ehs-training', '培训管理', 'GraduationCap', 2, '/ehs/training', 'ehs:training:read', 'ehs_process'),
    ('ehs-drill', '应急演练', 'LifeBuoy', 3, '/ehs/drill', 'ehs:drill:read', 'ehs_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 实验室管理 (lims) Menu Groups & Items
-- ============================================================

-- Menu groups for 实验室管理
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('lims_analytics', '实验室管理分析', 'BarChart3', 14),
    ('lims_business', '实验室管理业务', 'Briefcase', 12),
    ('lims_overview', '实验室管理概览', 'LayoutDashboard', 11),
    ('lims_settings', '实验室管理设置', 'Settings', 15)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 实验室管理
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('lims-uncertainty', '不确定度', 'Activity', 1, '/lims/uncertainty', 'lims:uncertainty:read', 'lims_analytics'),
    ('lims-inspection-result', '检验结果', 'FileCheck', 2, '/lims/inspection-result', 'lims:result:read', 'lims_analytics'),
    ('lims-proficiency-testing', '能力验证', 'Award', 3, '/lims/proficiency-testing', 'lims:proficiency:read', 'lims_analytics'),
    ('lims-sample', '样品管理', 'Package', 1, '/lims/sample', 'lims:sample:read', 'lims_business'),
    ('lims-sample-receive', '样品接收', 'FilePlus', 2, '/lims/sample-receive', 'lims:sample:write', 'lims_business'),
    ('lims-task', '检验任务', 'ClipboardList', 3, '/lims/task', 'lims:task:read', 'lims_business'),
    ('lims-inspection-task', '检验任务列表', 'CheckSquare', 4, '/lims/inspection-task', 'lims:task:read', 'lims_business'),
    ('lims-process', '检验流程', 'GitBranch', 5, '/lims/process', 'lims:process:read', 'lims_business'),
    ('lims-instrument', '仪器设备', 'Microscope', 6, '/lims/instrument', 'lims:instrument:read', 'lims_business'),
    ('lims-instrument-maintenance', '仪器维护', 'Wrench', 7, '/lims/instrument-maintenance', 'lims:instrument:write', 'lims_business'),
    ('lims-reagent', '试剂管理', 'FlaskRound', 8, '/lims/reagent', 'lims:reagent:read', 'lims_business'),
    ('lims-dashboard', '仪表盘', 'LayoutDashboard', 0, '/lims/dashboard', 'lims:read', 'lims_overview'),
    ('lims-test-method', '测试方法', 'FileText', 1, '/lims/test-method', 'lims:test_method:read', 'lims_settings'),
    ('lims-barcode', '条码管理', 'Barcode', 2, '/lims/barcode', 'lims:barcode:read', 'lims_settings')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 客户关系 (crm) Menu Groups & Items
-- ============================================================

-- Menu groups for 客户关系
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('crm_analytics', '客户关系分析', 'BarChart3', 10),
    ('crm_business', '客户关系业务', 'Briefcase', 8),
    ('crm_overview', '客户关系概览', 'LayoutDashboard', 7),
    ('crm_process', '客户关系流程', 'GitBranch', 9)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 客户关系
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('crm-recommendation', '智能推荐', 'Sparkles', 1, '/crm/recommendation', 'crm:recommendation:read', 'crm_analytics'),
    ('crm-customers', '客户管理', 'UserCircle', 1, '/crm/customers', 'crm:customer:read', 'crm_business'),
    ('crm-contacts', '联系人', 'User', 2, '/crm/contacts', 'crm:contact:read', 'crm_business'),
    ('crm-opportunities', '商机管理', 'Target', 3, '/crm/opportunities', 'crm:opportunity:read', 'crm_business'),
    ('crm-interactions', '互动记录', 'MessageSquare', 4, '/crm/interactions', 'crm:interaction:read', 'crm_business'),
    ('crm-returns', '退货/售后', 'RotateCcw', 5, '/crm/returns', 'crm:return:read', 'crm_business'),
    ('crm-customer-segmentation', '客户分群', 'Layers', 6, '/crm/customer-segmentation', 'crm:segmentation:read', 'crm_business'),
    ('crm-customer-scoring', '客户评分', 'Award', 7, '/crm/customer-scoring', 'crm:scoring:read', 'crm_business'),
    ('crm-dashboard', '仪表盘', 'LayoutDashboard', 0, '/crm/dashboard', 'crm:read', 'crm_overview'),
    ('crm-sales-funnel', '销售漏斗', 'TrendingUp', 1, '/crm/sales-funnel', 'crm:funnel:read', 'crm_process'),
    ('crm-sales-forecast', '销售预测', 'BarChart3', 2, '/crm/sales-forecast', 'crm:forecast:read', 'crm_process'),
    ('crm-billing', '计费管理', 'CreditCard', 3, '/crm/billing', 'crm:billing:read', 'crm_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 质量管理 (qms) Menu Groups & Items
-- ============================================================

-- Menu groups for 质量管理
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('qms_analytics', '质量管理分析', 'BarChart3', 12),
    ('qms_business', '质量管理业务', 'Briefcase', 10),
    ('qms_overview', '质量管理概览', 'LayoutDashboard', 9),
    ('qms_process', '质量管理流程', 'GitBranch', 11)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 质量管理
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('qms-spc', 'SPC统计', 'TrendingUp', 1, '/qms/spc', 'qms:spc:read', 'qms_analytics'),
    ('qms-quality-cost', '质量成本', 'Wallet', 2, '/qms/quality-cost', 'qms:quality_cost:read', 'qms_analytics'),
    ('qms-inspection', '质检任务', 'CheckSquare', 1, '/qms/inspection', 'qms:inspection:read', 'qms_business'),
    ('qms-quality-control', '质量控制', 'ClipboardList', 2, '/qms/quality-control', 'qms:quality_control:read', 'qms_business'),
    ('qms-nonconformance', '不合格品', 'XCircle', 3, '/qms/nonconformance', 'qms:nonconformance:read', 'qms_business'),
    ('qms-standards', '质量标准', 'FileText', 4, '/qms/standards', 'qms:standard:read', 'qms_business'),
    ('qms-dashboard', '仪表盘', 'LayoutDashboard', 0, '/qms/dashboard', 'qms:read', 'qms_overview'),
    ('qms-audit-management', '审核管理', 'SearchCheck', 1, '/qms/audit-management', 'qms:audit:read', 'qms_process'),
    ('qms-apqp', 'APQP管理', 'BookOpen', 2, '/qms/apqp', 'qms:apqp:read', 'qms_process'),
    ('qms-fmea', 'FMEA分析', 'AlertTriangle', 3, '/qms/fmea', 'qms:fmea:read', 'qms_process'),
    ('qms-eightd', '8D报告', 'FileCheck', 4, '/qms/eightd', 'qms:eightd:read', 'qms_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 供应链管理 (scm) Menu Groups & Items
-- ============================================================

-- Menu groups for 供应链管理
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('scm_analytics', '供应链管理分析', 'BarChart3', 13),
    ('scm_business', '供应链管理业务', 'Briefcase', 11),
    ('scm_overview', '供应链管理概览', 'LayoutDashboard', 10),
    ('scm_process', '供应链管理流程', 'GitBranch', 12)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 供应链管理
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('scm-overview', '供应链概览', 'PieChart', 1, '/scm/overview', 'scm:read', 'scm_analytics'),
    ('scm-inventory-turnover', '库存周转', 'TrendingUp', 2, '/scm/inventory-turnover', 'scm:inventory_turnover:read', 'scm_analytics'),
    ('scm-price-comparison', '价格对比', 'BarChart3', 3, '/scm/price-comparison', 'scm:price_comparison:read', 'scm_analytics'),
    ('scm-purchase-orders', '采购订单', 'ClipboardList', 1, '/scm/purchase-orders', 'scm:purchase_order:read', 'scm_business'),
    ('scm-purchase-requisition', '采购申请', 'FileText', 2, '/scm/purchase-requisition', 'scm:purchase_requisition:read', 'scm_business'),
    ('scm-purchase-items', '采购明细', 'List', 3, '/scm/purchase-items', 'scm:purchase_item:read', 'scm_business'),
    ('scm-suppliers', '供应商管理', 'Building', 4, '/scm/suppliers', 'scm:supplier:read', 'scm_business'),
    ('scm-supplier-admission', '供应商准入', 'UserPlus', 5, '/scm/supplier-admission', 'scm:supplier_admission:read', 'scm_business'),
    ('scm-dashboard', '仪表盘', 'LayoutDashboard', 0, '/scm/dashboard', 'scm:read', 'scm_overview'),
    ('scm-supplier-evaluation', '供应商评估', 'Award', 1, '/scm/supplier-evaluation', 'scm:supplier_evaluation:read', 'scm_process'),
    ('scm-contracts', '合同管理', 'FileText', 2, '/scm/contracts', 'scm:contract:read', 'scm_process'),
    ('scm-delivery-appointment', '交期预约', 'Calendar', 3, '/scm/delivery-appointment', 'scm:delivery_appointment:read', 'scm_process'),
    ('scm-mrp-plan', 'MRP计划', 'LayoutGrid', 4, '/scm/mrp-plan', 'scm:mrp_plan:read', 'scm_process'),
    ('scm-mrp-suggestion', 'MRP建议', 'Lightbulb', 5, '/scm/mrp-suggestion', 'scm:mrp_suggestion:read', 'scm_process'),
    ('scm-purchase-contract', '采购合同', 'FileText', 6, '/scm/purchase-contract', 'scm:contract:read', 'scm_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 供应商关系 (srm) Menu Groups & Items
-- ============================================================

-- Menu groups for 供应商关系
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('srm_analytics', '供应商关系分析', 'BarChart3', 17),
    ('srm_business', '供应商关系业务', 'Briefcase', 15),
    ('srm_overview', '供应商关系概览', 'LayoutDashboard', 14),
    ('srm_process', '供应商关系流程', 'GitBranch', 16),
    ('srm_settings', '供应商关系设置', 'Settings', 18)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 供应商关系
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('srm-evaluation', '供应商评估', 'Star', 1, '/srm/evaluation', 'srm:evaluation:read', 'srm_analytics'),
    ('srm-performance', '绩效分析', 'TrendingUp', 2, '/srm/performance', 'srm:performance:read', 'srm_analytics'),
    ('srm-supplier', '供应商管理', 'Building2', 1, '/srm/supplier', 'srm:supplier:read', 'srm_business'),
    ('srm-category', '品类管理', 'Tags', 2, '/srm/category', 'srm:category:read', 'srm_business'),
    ('srm-product', '产品管理', 'Package', 3, '/srm/product', 'srm:product:read', 'srm_business'),
    ('srm-contract', '合同管理', 'FileCheck', 4, '/srm/contract', 'srm:contract:read', 'srm_business'),
    ('srm-order', '采购订单', 'ShoppingCart', 5, '/srm/order', 'srm:order:read', 'srm_business'),
    ('srm-finance', '财务管理', 'Wallet', 6, '/srm/finance', 'srm:finance:read', 'srm_business'),
    ('srm-portal', '供应商门户', 'ExternalLink', 7, '/srm/portal', 'srm:portal:read', 'srm_business'),
    ('srm-dashboard', '仪表盘', 'LayoutDashboard', 0, '/srm/dashboard', 'srm:read', 'srm_overview'),
    ('srm-inquiry', '询报价管理', 'MessageSquareQuote', 1, '/srm/inquiry', 'srm:inquiry:read', 'srm_process'),
    ('srm-bidding', '招标管理', 'Award', 2, '/srm/bidding', 'srm:bidding:read', 'srm_process'),
    ('srm-quotation', '报价管理', 'FileText', 3, '/srm/quotation', 'srm:quotation:read', 'srm_process'),
    ('srm-scoring-dimension', '评分维度', 'Target', 1, '/srm/scoring-dimension', 'srm:evaluation:read', 'srm_settings')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 报表中心 (report) Menu Groups & Items
-- ============================================================

-- Menu groups for 报表中心
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('report_business', '报表中心业务', 'Briefcase', 7),
    ('report_overview', '报表中心概览', 'LayoutDashboard', 6),
    ('report_process', '报表中心流程', 'GitBranch', 8),
    ('report_settings', '报表中心设置', 'Settings', 10)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 报表中心
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('report-list', '报表列表', 'List', 1, '/report/list', 'report:read', 'report_business'),
    ('report-design', '报表设计', 'Wand2', 2, '/report/design', 'report:design:write', 'report_business'),
    ('report-builder', '报表构建', 'Blocks', 3, '/report/builder', 'report:builder:write', 'report_business'),
    ('report-report', '报表', 'FileSpreadsheet', 4, '/report/report', 'report:read', 'report_business'),
    ('report-dashboard', '报表中心', 'LayoutDashboard', 0, '/report/dashboard', 'report:read', 'report_overview'),
    ('report-schedule', '定时任务', 'Clock', 1, '/report/schedule', 'report:schedule:read', 'report_process'),
    ('report-subscription', '报表订阅', 'Bell', 2, '/report/subscription', 'report:subscription:read', 'report_process'),
    ('report-template', '模板管理', 'FolderKanban', 1, '/report/template', 'report:template:read', 'report_settings')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

-- ============================================================
-- 项目管理 (pm) Menu Groups & Items
-- ============================================================

-- Menu groups for 项目管理
INSERT INTO core_menu_groups (id, code, name, icon, sort_order, status, tenant_id)
SELECT gen_random_uuid(), v.code, v.name, v.icon, v.sort_order, 'active', '00000000-0000-0000-0000-000000000000'
FROM (VALUES
    ('pm_analytics', '项目管理分析', 'BarChart3', 16),
    ('pm_business', '项目管理业务', 'Briefcase', 14),
    ('pm_overview', '项目管理概览', 'LayoutDashboard', 13),
    ('pm_process', '项目管理流程', 'GitBranch', 15)
) AS v(code, name, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Menu items for 项目管理
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('pm-reports', '项目报表', 'BarChart3', 1, '/pm/reports', 'pm:report:read', 'pm_analytics'),
    ('pm-projects', '项目列表', 'FolderKanban', 1, '/pm/projects', 'pm:project:read', 'pm_business'),
    ('pm-contracts', '合同管理', 'FileText', 2, '/pm/contracts', 'pm:contract:read', 'pm_business'),
    ('pm-dashboard', '仪表盘', 'LayoutDashboard', 0, '/pm/dashboard', 'pm:read', 'pm_overview'),
    ('pm-resources', '资源管理', 'Users', 1, '/pm/resources', 'pm:resource:read', 'pm_process'),
    ('pm-templates', '模板管理', 'LayoutTemplate', 2, '/pm/templates', 'pm:template:read', 'pm_process')
) AS v(code, name, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    permissions = EXCLUDED.permissions;

