-- ============================================================
-- 审计整改批 1（P1 菜单对账）：MENU_ORPHAN_FE 补种
-- 来源：scripts/audit_menu_consistency.py（对账自动生成草稿后核查落盘）
-- 范围：13 个已有种子模块的 62 项前端孤儿 navItem 补入 core_menus
--       覆盖：mes 15 / wms 10 / qms 8 / scm 6 / pdm 5 / hrm 5 / pm 5 /
--             crm 3 / lims 2 / finance 2 / report 1
-- 说明：permission 以 <module>:read 占位，P3 权限码统一专项（FE 413/BE 846）校准；
--       其余 22 模块（erp/aps/asset/admin/ai/bi/…）孤儿随 P2-P3 业务域收敛统一处理，
--       本迁移不补，避免与后续合并冲突。
-- 幂等：ON CONFLICT (tenant_id, code) DO UPDATE，可重复执行。
-- ============================================================
-- ============================================================
-- 审计整改 P1：MENU_ORPHAN_FE 补种（audit_menu_consistency.py 自动生成草稿）
-- 注意：permission 以 <module>:read 占位，须按权限码统一专项校准；
--       name 来自前端 i18n zh 文案，无法解析处回退为 code。
-- ============================================================

-- crm（3 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('RFM 分析', 'crm-rfm', 'Activity', 100, '/crm/rfm', 'crm:read', 'crm_analytics'),
    ('预测算法', 'crm-forecast-algorithm', 'Calculator', 101, '/crm/forecast-algorithm', 'crm:read', 'crm_analytics'),
    ('crm-tags', 'crm-tags', 'Tags', 102, '/crm/tags', 'crm:read', 'crm_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- finance（2 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('合并报表中心', 'finance-consolidation-reports', 'FileSpreadsheet', 100, '/finance/consolidation-reports', 'finance:read', 'finance_analytics'),
    ('预算明细', 'finance-budget-detail', 'PieChart', 101, '/finance/budget-detail', 'finance:read', 'finance_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- hrm（5 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('系统初始化', 'hrm-setup', 'Settings', 100, '/hrm/setup', 'hrm:read', 'hrm_business'),
    ('考勤规则', 'hrm-attendance-rule', 'Clock', 101, '/hrm/setting/attendance-rule', 'hrm:read', 'hrm_business'),
    ('薪资模板', 'hrm-payroll-template', 'Wallet', 102, '/hrm/setting/payroll-template', 'hrm:read', 'hrm_business'),
    ('招聘流程', 'hrm-recruitment-flow', 'UserPlus', 103, '/hrm/setting/recruitment-flow', 'hrm:read', 'hrm_business'),
    ('培训计划', 'hrm-training-plan', 'GraduationCap', 104, '/hrm/setting/training-plan', 'hrm:read', 'hrm_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- lims（2 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('仪器数据', 'lims-instrument-data', 'Database', 100, '/lims/instrument-data', 'lims:read', 'lims_business'),
    ('lims-method-categories', 'lims-method-categories', 'Layers', 101, '/lims/method-categories', 'lims:read', 'lims_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- mes（15 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('物料BOM', 'mes-material-bom', 'GitBranch', 100, '/mes/material-bom', 'mes:read', 'mes_business'),
    ('物料领用', 'mes-material-issue', 'ArrowUpFromLine', 101, '/mes/material-issue', 'mes:read', 'mes_business'),
    ('物料退库', 'mes-material-return', 'ArrowDownToLine', 102, '/mes/material-return', 'mes:read', 'mes_business'),
    ('OEE分析', 'mes-analytics-oee', 'Gauge', 103, '/mes/analytics/oee', 'mes:read', 'mes_analytics'),
    ('交付分析', 'mes-analytics-delivery', 'Truck', 104, '/mes/analytics/delivery', 'mes:read', 'mes_analytics'),
    ('质量帕累托', 'mes-analytics-quality-pareto', 'BarChart3', 105, '/mes/analytics/quality-pareto', 'mes:read', 'mes_analytics'),
    ('MTBF分析', 'mes-analytics-mtbf', 'Wrench', 106, '/mes/analytics/mtbf', 'mes:read', 'mes_analytics'),
    ('能耗分析', 'mes-analytics-energy', 'Zap', 107, '/mes/analytics/energy', 'mes:read', 'mes_analytics'),
    ('产能分析', 'mes-analytics-capacity', 'TrendingUp', 108, '/mes/analytics/capacity', 'mes:read', 'mes_analytics'),
    ('质检模板', 'mes-quality-template', 'ClipboardCheck', 109, '/mes/setting/quality-template', 'mes:read', 'mes_business'),
    ('BOM版本策略', 'mes-bom-version-policy', 'GitBranch', 110, '/mes/setting/bom-version-policy', 'mes:read', 'mes_business'),
    ('APS配置', 'mes-aps-config', 'Settings2', 111, '/mes/setting/aps-config', 'mes:read', 'mes_business'),
    ('设备预警阈值', 'mes-equipment-threshold', 'Gauge', 112, '/mes/setting/equipment-threshold', 'mes:read', 'mes_business'),
    ('主数据', 'mes-master-data', 'Factory', 113, '/mes/master-data', 'mes:read', 'mes_business'),
    ('mes-capacity', 'mes-capacity', 'CalendarDays', 114, '/mes/capacity', 'mes:read', 'mes_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- pdm（5 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('图纸管理', 'pdm-drawing', 'FileText', 100, '/pdm/drawing', 'pdm:read', 'pdm_business'),
    ('BOM 模板', 'pdm-bom-template', 'GitBranch', 101, '/pdm/setting/bom-template', 'pdm:read', 'pdm_business'),
    ('分类规则', 'pdm-category-rule', 'Tags', 102, '/pdm/setting/category-rule', 'pdm:read', 'pdm_business'),
    ('文档审批流', 'pdm-doc-approval-flow', 'FileCheck', 103, '/pdm/setting/doc-approval-flow', 'pdm:read', 'pdm_business'),
    ('变更模板', 'pdm-change-template', 'RefreshCw', 104, '/pdm/setting/change-template', 'pdm:read', 'pdm_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- pm（5 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('项目列表', 'pm-project-list', 'ListTree', 100, '/pm/project-list', 'pm:read', 'pm_business'),
    ('任务看板', 'pm-task-kanban', 'SquareKanban', 101, '/pm/task-kanban', 'pm:read', 'pm_business'),
    ('项目向导', 'pm-project-wizard', 'Wand2', 102, '/pm/project-wizard', 'pm:read', 'pm_business'),
    ('项目类型模板', 'pm-project-type-config', 'ClipboardList', 103, '/pm/project-type-config', 'pm:read', 'pm_process'),
    ('项目时间线', 'pm-timeline', 'Clock', 104, '/pm/timeline', 'pm:read', 'pm_analytics')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- qms（8 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('纠正措施', 'qms-corrective-actions', 'Wrench', 100, '/qms/corrective-actions', 'qms:read', 'qms_business'),
    ('质量趋势', 'qms-quality-trend', 'LineChart', 101, '/qms/analytics/quality-trend', 'qms:read', 'qms_analytics'),
    ('缺陷帕累托', 'qms-defect-pareto', 'BarChart3', 102, '/qms/analytics/defect-pareto', 'qms:read', 'qms_analytics'),
    ('成本分析', 'qms-cost-analysis', 'PieChart', 103, '/qms/analytics/cost-analysis', 'qms:read', 'qms_analytics'),
    ('控制图', 'qms-spc-control-chart', 'Activity', 104, '/qms/analytics/spc-control-chart', 'qms:read', 'qms_analytics'),
    ('风险矩阵', 'qms-fmea-risk-matrix', 'Grid3x3', 105, '/qms/analytics/fmea-risk-matrix', 'qms:read', 'qms_analytics'),
    ('检验标准配置', 'qms-inspection-standard', 'ClipboardList', 106, '/qms/inspection-standard', 'qms:read', 'qms_business'),
    ('合规审核', 'qms-audit-compliance', 'ShieldCheck', 107, '/qms/analytics/audit-compliance', 'qms:read', 'qms_analytics')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- report（1 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('报表查看', 'report-viewer', 'Eye', 100, '/report/viewer', 'report:read', 'report_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- scm（6 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('到货通知', 'scm-incoming-notices', 'Truck', 100, '/scm/incoming-notices', 'scm:read', 'scm_process'),
    ('来料检验', 'scm-incoming-inspections', 'ClipboardCheck', 101, '/scm/incoming-inspections', 'scm:read', 'scm_process'),
    ('寻源策略', 'scm-sourcing-strategy', 'Search', 102, '/scm/setting/sourcing-strategy', 'scm:read', 'scm_business'),
    ('配额模板', 'scm-quota-template', 'PieChart', 103, '/scm/setting/quota-template', 'scm:read', 'scm_business'),
    ('采购阈值', 'scm-purchase-threshold', 'AlertTriangle', 104, '/scm/setting/purchase-threshold', 'scm:read', 'scm_business'),
    ('供应商分级', 'scm-supplier-tier', 'Award', 105, '/scm/setting/supplier-tier', 'scm:read', 'scm_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;

-- wms（10 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active', json_build_object('permission', v.permission)
FROM (VALUES
    ('库存周转分析', 'wms-analytics-turnover', 'TrendingUp', 100, '/wms/analytics/inventory-turnover', 'wms:read', 'wms_analytics'),
    ('帕累托分析', 'wms-analytics-pareto', 'BarChart2', 101, '/wms/analytics/age-pareto', 'wms:read', 'wms_analytics'),
    ('出入库趋势', 'wms-analytics-flow', 'AreaChart', 102, '/wms/analytics/flow-trend', 'wms:read', 'wms_analytics'),
    ('ABC 分析', 'wms-analytics-abc', 'PieChart', 103, '/wms/analytics/abc-analysis', 'wms:read', 'wms_analytics'),
    ('库位利用率', 'wms-analytics-locutil', 'MapPin', 104, '/wms/analytics/location-utilization', 'wms:read', 'wms_analytics'),
    ('订单履约', 'wms-analytics-fulfillment', 'Gauge', 105, '/wms/analytics/order-fulfillment', 'wms:read', 'wms_analytics'),
    ('库位规则', 'wms-location-rule', 'MapPin', 106, '/wms/setting/location-rule', 'wms:read', 'wms_business'),
    ('FIFO 策略', 'wms-fifo-policy', 'ArrowRightLeft', 107, '/wms/setting/fifo-policy', 'wms:read', 'wms_business'),
    ('盘点周期设置', 'wms-inventory-cycle', 'ClipboardCheck', 108, '/wms/setting/inventory-cycle', 'wms:read', 'wms_business'),
    ('库存阈值设置', 'wms-inventory-threshold', 'AlertTriangle', 109, '/wms/setting/inventory-threshold', 'wms:read', 'wms_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE SET path = EXCLUDED.path, permissions = EXCLUDED.permissions;